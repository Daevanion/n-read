import { objectStore } from "@/lib/store";

export type CacheEnvelope<T> = {
  v: 1;
  storedAt: number;
  freshUntil: number;
  staleUntil: number;
  value: T;
};

type StoreFns = {
  read(key: string): Promise<string | null>;
  write(key: string, body: string): Promise<void>;
};

const MAX_ENTRY_CHARS = 1_500_000;

export function createCatalogCache(options: {
  store: StoreFns;
  now?: () => number;
  maxMemory?: number;
}) {
  const now = options.now ?? Date.now;
  const maxMemory = options.maxMemory ?? 400;
  const memory = new Map<string, CacheEnvelope<unknown>>();
  const inflight = new Map<string, Promise<unknown>>();

  function remember<T>(key: string, envelope: CacheEnvelope<T>) {
    memory.delete(key);
    memory.set(key, envelope);
    while (memory.size > maxMemory) {
      const oldest = memory.keys().next().value;
      if (oldest === undefined) break;
      memory.delete(oldest);
    }
  }

  async function readEnvelope<T>(key: string): Promise<CacheEnvelope<T> | null> {
    const hit = memory.get(key) as CacheEnvelope<T> | undefined;
    if (hit) {
      remember(key, hit);
      return hit;
    }
    let raw: string | null = null;
    try {
      raw = await options.store.read(key);
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as CacheEnvelope<T>;
      if (parsed?.v !== 1 || parsed.staleUntil == null) return null;
      remember(key, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  async function fill<T>(
    key: string,
    freshMs: number,
    staleMs: number,
    load: () => Promise<T>,
  ): Promise<T> {
    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;
    const run = (async () => {
      const value = await load();
      const storedAt = now();
      const envelope: CacheEnvelope<T> = {
        v: 1,
        storedAt,
        freshUntil: storedAt + freshMs,
        staleUntil: storedAt + freshMs + staleMs,
        value,
      };
      remember(key, envelope);
      const body = JSON.stringify(envelope);
      if (body.length <= MAX_ENTRY_CHARS) {
        try {
          await options.store.write(key, body);
        } catch {
          // A storage miss must not hide a value we already fetched.
        }
      }
      return value;
    })();
    inflight.set(key, run);
    try {
      return await run;
    } finally {
      if (inflight.get(key) === run) inflight.delete(key);
    }
  }

  return {
    async get<T>(
      key: string,
      freshMs: number,
      staleMs: number,
      load: () => Promise<T>,
    ): Promise<T> {
      const envelope = await readEnvelope<T>(key);
      const t = now();
      if (envelope && envelope.staleUntil > t) {
        if (envelope.freshUntil <= t) {
          void fill(key, freshMs, staleMs, load).catch(() => undefined);
        }
        return envelope.value;
      }
      return fill(key, freshMs, staleMs, load);
    },
  };
}

const catalog = createCatalogCache({ store: lazyStore() });

function lazyStore(): StoreFns {
  return {
    read: (key) => objectStore().read(key),
    write: (key, body) => objectStore().write(key, body),
  };
}

export function catalogGet<T>(
  key: string,
  freshMs: number,
  staleMs: number,
  load: () => Promise<T>,
): Promise<T> {
  return catalog.get(key, freshMs, staleMs, load);
}
