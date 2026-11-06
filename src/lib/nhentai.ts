import { cache } from "react";
import { NhentaiError } from "@/lib/errors";
import {
  galleryIsBlocked,
  rejectBlockedItems,
} from "@/lib/filter";
import { DEFAULT_CDN } from "@/lib/media";
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

async function nhentaiFetch<T>(
  path: string,
  init: RequestInit & { revalidate?: number } = {},
): Promise<T> {
  const { revalidate = 60, ...rest } = init;
  const url = `${API_BASE}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: { ...headers(), ...rest.headers },
      signal: rest.signal ?? AbortSignal.timeout(15_000),
      next: { revalidate },
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

export async function listGalleries(
  page = 1,
  perPage = 25,
): Promise<PaginatedGalleries> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const data = await nhentaiFetch<PaginatedGalleries>(`/galleries?${params}`, {
    revalidate: 60,
  });
  return { ...data, result: rejectBlockedItems(data.result ?? []) };
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
  const data = await nhentaiFetch<PaginatedGalleries>(`/search?${params}`, {
    revalidate: 30,
  });
  return { ...data, result: rejectBlockedItems(data.result ?? []) };
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
  const data = await nhentaiFetch<PaginatedGalleries>(
    `/galleries/tagged?${params}`,
    { revalidate: 60 },
  );
  return { ...data, result: rejectBlockedItems(data.result ?? []) };
}

export async function getPopular(): Promise<GalleryListItem[]> {
  const data = await nhentaiFetch<GalleryListItem[]>("/galleries/popular", {
    revalidate: 120,
  });
  return rejectBlockedItems(Array.isArray(data) ? data : []);
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
  const data = await nhentaiFetch<GalleryDetail>(
    `/galleries/${id}?include=related`,
    { revalidate: 300 },
  );
  if (galleryIsBlocked(data)) {
    throw new NhentaiError("This gallery is not available in eronikki.", 404);
  }
  return {
    ...data,
    related: data.related ? rejectBlockedItems(data.related) : data.related,
  };
});

export const getTagBySlug = cache(async function getTagBySlug(
  type: string,
  slug: string,
): Promise<Tag> {
  return nhentaiFetch<Tag>(
    `/tags/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`,
    { revalidate: 3600 },
  );
});

export async function searchTags(query: string, limit = 8): Promise<Tag[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const data = await nhentaiFetch<Tag[]>("/tags/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q.slice(0, 80), limit }),
    revalidate: 0,
  });
  return Array.isArray(data) ? data.slice(0, limit) : [];
}

export { API_BASE, USER_AGENT };
