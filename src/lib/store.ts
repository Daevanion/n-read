import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { authorizationHeader, encodeObjectKey, sha256Hex } from "@/lib/s3";

const KEY_RE = /^[a-z0-9][a-z0-9/_.-]{0,180}$/;

export type ObjectStore = {
  kind: "s3" | "disk";
  read(key: string): Promise<string | null>;
  write(key: string, body: string): Promise<void>;
};

export function assertCacheKey(key: string): string {
  if (!KEY_RE.test(key) || key.includes("..")) {
    throw new Error("Cache key is not allowed.");
  }
  return key;
}

export function createDiskStore(root: string): ObjectStore {
  const base = path.resolve(root);
  return {
    kind: "disk",
    async read(key) {
      const file = resolveInside(base, assertCacheKey(key));
      try {
        return await readFile(file, "utf8");
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },
    async write(key, body) {
      const file = resolveInside(base, assertCacheKey(key));
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body, "utf8");
    },
  };
}

function resolveInside(root: string, key: string): string {
  const file = path.resolve(root, key);
  if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
    throw new Error("Cache key is not allowed.");
  }
  return file;
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

export type S3Config = {
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export function s3ConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): S3Config | null {
  const endpoint = env.CACHE_S3_ENDPOINT?.trim();
  const bucket = env.CACHE_S3_BUCKET?.trim();
  const accessKeyId = env.CACHE_S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.CACHE_S3_SECRET_ACCESS_KEY?.trim();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return {
    endpoint: endpoint.replace(/\/+$/, ""),
    bucket,
    region: env.CACHE_S3_REGION?.trim() || "auto",
    accessKeyId,
    secretAccessKey,
  };
}

export function createS3Store(config: S3Config): ObjectStore {
  const origin = new URL(config.endpoint).origin;
  const host = new URL(config.endpoint).host;

  async function request(method: "GET" | "PUT", key: string, body?: string) {
    const safe = assertCacheKey(key);
    const objectPath = `/${config.bucket}/${encodeObjectKey(safe)}`;
    const payloadHash = sha256Hex(body ?? "");
    const amzDate = new Date()
      .toISOString()
      .replace(/[:-]|\.\d{3}/g, "");
    const headers: Record<string, string> = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };
    if (method === "PUT") headers["content-type"] = "application/json";
    const authorization = authorizationHeader({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      amzDate,
      method,
      path: objectPath,
      headers,
      payloadHash,
    });
    return fetch(`${origin}${objectPath}`, {
      method,
      headers: {
        authorization,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        ...(method === "PUT" ? { "content-type": "application/json" } : {}),
      },
      body: method === "PUT" ? body : undefined,
      cache: "no-store",
    });
  }

  return {
    kind: "s3",
    async read(key) {
      const response = await request("GET", key);
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`Object storage returned ${response.status}.`);
      }
      return response.text();
    },
    async write(key, body) {
      const response = await request("PUT", key, body);
      if (!response.ok) {
        throw new Error(`Object storage returned ${response.status}.`);
      }
    },
  };
}

let singleton: ObjectStore | null = null;

export function objectStore(): ObjectStore {
  if (singleton) return singleton;
  const config = s3ConfigFromEnv();
  singleton = config
    ? createS3Store(config)
    : createDiskStore(
        process.env.CACHE_DIR?.trim() || path.join(process.cwd(), "data", "cache"),
      );
  return singleton;
}

export function cacheBackend(): "s3" | "disk" {
  return s3ConfigFromEnv() ? "s3" : "disk";
}
