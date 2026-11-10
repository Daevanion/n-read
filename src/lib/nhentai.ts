import { createHash } from "node:crypto";
import { cache } from "react";
import { catalogGet } from "@/lib/catalog-cache";
import { NhentaiError } from "@/lib/errors";
import {
  galleryIsBlocked,
  rejectBlockedItems,
  tagLooksBlocked,
} from "@/lib/filter";
import { DEFAULT_CDN } from "@/lib/media";
import {
  ANON_PER_MINUTE,
  MAX_PACE_WAIT_MS,
  createPacer,
  endpointBucket,
} from "@/lib/pace";
import type {
  CdnConfig,
  GalleryDetail,
  GalleryListItem,
  PaginatedGalleries,
  SortOption,
  Tag,
} from "@/lib/types";

const API_BASE = "https://nhentai.net/api/v2";
const USER_AGENT = "eronikki/0.1 (manga reader; https://nhentai.net/api/v2/docs)";

function headers(): HeadersInit {
  const result: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": USER_AGENT,
  };
  const key = process.env.NHENTAI_API_KEY?.trim();
  if (key) result.Authorization = `Key ${key}`;
  return result;
}

const pacer = createPacer();
const inflight = new Map<string, Promise<unknown>>();

function perMinuteFor(bucket: string): number {
  const base = ANON_PER_MINUTE[bucket] ?? ANON_PER_MINUTE.other;
  return process.env.NHENTAI_API_KEY?.trim() ? base * 3 : base;
}

async function nhentaiFetch<T>(
  path: string,
  init: RequestInit & { revalidate?: number } = {},
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const flightKey = `${method} ${path} ${typeof init.body === "string" ? init.body : ""}`;
  const pending = inflight.get(flightKey);
  if (pending) return pending as Promise<T>;

  const run = Promise.resolve().then(() => loadFromNhentai<T>(path, init));
  inflight.set(flightKey, run);
  try {
    return await run;
  } finally {
    if (inflight.get(flightKey) === run) inflight.delete(flightKey);
  }
}

async function loadFromNhentai<T>(
  path: string,
  init: RequestInit & { revalidate?: number },
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const bucket = endpointBucket(path, method);
  const wait = pacer.reserve(bucket, perMinuteFor(bucket));
  if (wait > MAX_PACE_WAIT_MS) {
    throw new NhentaiError(
      "nhentai is rate-limiting this network. Wait a minute, or add an API key for a higher cap.",
      429,
    );
  }
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }

  const rest: RequestInit = { ...init };
  delete (rest as { revalidate?: number }).revalidate;
  const url = `${API_BASE}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: { ...headers(), ...rest.headers },
      signal: rest.signal ?? AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch {
    throw new NhentaiError(
      "Could not reach the nhentai API. Check your network and try again.",
      503,
    );
  }

  if (response.status === 404) {
    throw new NhentaiError("That gallery or tag was not found.", 404);
  }
  if (response.status === 429) {
    throw new NhentaiError(
      "nhentai is rate-limiting this network. Wait a minute, or add an API key for a higher cap.",
      429,
    );
  }
  if (!response.ok) {
    throw new NhentaiError(
      `nhentai returned ${response.status}. Try again in a moment.`,
      response.status,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new NhentaiError("nhentai sent a response that was not JSON.", 502);
  }
}

export const getCdnConfig = cache(async function getCdnConfig(): Promise<CdnConfig> {
  try {
    const config = await nhentaiFetch<CdnConfig>("/cdn", { revalidate: 3600 });
    if (
      Array.isArray(config.image_servers) &&
      config.image_servers.length > 0 &&
      Array.isArray(config.thumb_servers) &&
      config.thumb_servers.length > 0
    ) {
      return config;
    }
  } catch {
    // Fall through to the documented defaults.
  }
  return DEFAULT_CDN;
});

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 20);
}

function asNhentai(items: GalleryListItem[]): GalleryListItem[] {
  return rejectBlockedItems(items).map((item) => ({ ...item, source: "nhentai" }));
}

export async function listGalleries(
  page = 1,
  perPage = 25,
): Promise<PaginatedGalleries> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const data = await catalogGet(
    `nhentai/list/${page}/${perPage}`,
    MINUTE,
    30 * MINUTE,
    () => nhentaiFetch<PaginatedGalleries>(`/galleries?${params}`),
  );
  return { ...data, result: asNhentai(data.result ?? []) };
}

export async function searchGalleries(
  query: string,
  page = 1,
  sort: SortOption = "date",
): Promise<PaginatedGalleries> {
  const params = new URLSearchParams({
    query,
    page: String(page),
    sort,
  });
  const data = await catalogGet(
    `nhentai/search/${digest(`${query}\n${page}\n${sort}`)}`,
    2 * MINUTE,
    30 * MINUTE,
    () => nhentaiFetch<PaginatedGalleries>(`/search?${params}`),
  );
  return { ...data, result: asNhentai(data.result ?? []) };
}

export async function listTagged(
  tagId: number,
  page = 1,
  sort: SortOption = "date",
  perPage = 25,
): Promise<PaginatedGalleries> {
  const params = new URLSearchParams({
    tag_id: String(tagId),
    page: String(page),
    sort,
    per_page: String(perPage),
  });
  const data = await catalogGet(
    `nhentai/tagged/${tagId}/${page}/${sort}/${perPage}`,
    MINUTE,
    30 * MINUTE,
    () => nhentaiFetch<PaginatedGalleries>(`/galleries/tagged?${params}`),
  );
  return { ...data, result: asNhentai(data.result ?? []) };
}

export async function getPopular(): Promise<GalleryListItem[]> {
  const data = await catalogGet("nhentai/popular", 10 * MINUTE, 6 * HOUR, () =>
    nhentaiFetch<GalleryListItem[]>("/galleries/popular"),
  );
  return asNhentai(Array.isArray(data) ? data : []);
}

export async function getRandomId(): Promise<number> {
  const data = await nhentaiFetch<{ id: number }>("/galleries/random", {
    revalidate: 0,
  });
  if (!data?.id) throw new NhentaiError("Random gallery did not return an id.");
  return data.id;
}

export const getGallery = cache(async function getGallery(
  id: number,
): Promise<GalleryDetail> {
  const data = await catalogGet(`nhentai/gallery/${id}`, 6 * HOUR, 7 * DAY, () =>
    nhentaiFetch<GalleryDetail>(`/galleries/${id}?include=related`),
  );
  if (galleryIsBlocked(data)) {
    throw new NhentaiError("This gallery is not available in eronikki.", 404);
  }
  return {
    ...data,
    source: "nhentai",
    related: data.related ? asNhentai(data.related) : data.related,
  };
});

export const getTagBySlug = cache(async function getTagBySlug(
  type: string,
  slug: string,
): Promise<Tag> {
  return catalogGet(`nhentai/tag/${type}/${slug}`, 12 * HOUR, 7 * DAY, () =>
    nhentaiFetch<Tag>(
      `/tags/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`,
    ),
  );
});

export async function listTagsByType(
  type: string,
  page = 1,
  perPage = 36,
): Promise<Tag[]> {
  const params = new URLSearchParams({
    sort: "popular",
    page: String(page),
    per_page: String(perPage),
  });
  const data = await catalogGet(
    `nhentai/tags/${type}/${page}/${perPage}`,
    12 * HOUR,
    7 * DAY,
    () =>
      nhentaiFetch<{ result?: Tag[] }>(
        `/tags/${encodeURIComponent(type)}?${params}`,
      ),
  );
  return (data.result ?? []).filter((tag) => !tagLooksBlocked(tag)).slice(0, perPage);
}

export async function searchTags(query: string, limit = 8): Promise<Tag[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const body = JSON.stringify({
    query: q.slice(0, 80),
    limit: Math.min(limit + 8, 50),
  });
  const data = await catalogGet(`nhentai/tagsearch/${digest(body)}`, 10 * MINUTE, 6 * HOUR, () =>
    nhentaiFetch<Tag[]>("/tags/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );
  if (!Array.isArray(data)) return [];
  return data.filter((tag) => !tagLooksBlocked(tag)).slice(0, limit);
}

export { API_BASE, USER_AGENT };
