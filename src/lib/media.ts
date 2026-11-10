import type { CdnConfig } from "@/lib/types";

export const DEFAULT_CDN: CdnConfig = {
  image_servers: [
    "https://i1.nhentai.net",
    "https://i2.nhentai.net",
    "https://i3.nhentai.net",
    "https://i4.nhentai.net",
  ],
  thumb_servers: [
    "https://t1.nhentai.net",
    "https://t2.nhentai.net",
    "https://t3.nhentai.net",
    "https://t4.nhentai.net",
  ],
};

export const MEDIA_PATH_RE = /^galleries\/(\d+)\/([A-Za-z0-9._-]+)$/;

export type MediaKind = "i" | "t";

export type ParsedMediaPath = {
  mediaId: string;
  file: string;
  path: string;
};

export function parseMediaPath(raw: string): ParsedMediaPath | null {
  const path = raw.replace(/^\/+/, "");
  const match = MEDIA_PATH_RE.exec(path);
  if (!match) return null;
  return { mediaId: match[1], file: match[2], path: match[0] };
}

export function pickServer(servers: string[], mediaId: string): string {
  const list = servers.length > 0 ? servers : DEFAULT_CDN.image_servers;
  let sum = 0;
  for (const ch of mediaId) sum = (sum + ch.charCodeAt(0)) % 2147483647;
  const origin = list[sum % list.length] ?? list[0];
  return origin.replace(/\/+$/, "");
}

const HITOMI_HOST_RE = /^[a-z0-9-]+\.gold-usergeneratedcontent\.net$/;

export function hitomiPublicSrc(path: string): string | null {
  if (path.startsWith("/api/hitomi-image/")) return path;
  if (!/^https?:\/\//.test(path)) return null;
  let url: URL;
  try {
    url = new URL(path);
  } catch {
    return "";
  }
  if (!HITOMI_HOST_RE.test(url.hostname)) return null;
  if (!url.pathname.startsWith("/") || url.pathname.includes("..")) return "";
  const suffix = `${url.hostname}${url.pathname}`;
  const base = process.env.NEXT_PUBLIC_HITOMI_IMAGE_BASE?.replace(/\/+$/, "");
  return base ? `${base}/${suffix}` : `/api/hitomi-image/${suffix}`;
}

export function mediaSrc(kind: MediaKind, path: string): string {
  if (!path) return "";
  const hitomi = hitomiPublicSrc(path);
  if (hitomi !== null) return hitomi;
  if (/^https?:\/\//.test(path)) {
    try {
      const url = new URL(path);
      if (
        /^[it][1-4]\.nhentai\.net$/.test(url.hostname) &&
        url.pathname.startsWith("/galleries/") &&
        !url.pathname.includes("..")
      ) {
        return url.toString();
      }
    } catch {
      return "";
    }
    return "";
  }
  const parsed = parseMediaPath(path);
  if (!parsed) return "";
  const servers = kind === "t" ? DEFAULT_CDN.thumb_servers : DEFAULT_CDN.image_servers;
  return `${pickServer(servers, parsed.mediaId)}/${parsed.path}`;
}

export function isAllowedCdnOrigin(
  origin: string,
  kind: MediaKind,
  config: CdnConfig = DEFAULT_CDN,
): boolean {
  const allowed = kind === "t" ? config.thumb_servers : config.image_servers;
  const normalized = origin.replace(/\/+$/, "");
  return allowed.some((server) => server.replace(/\/+$/, "") === normalized);
}
