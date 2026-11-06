import { NextRequest } from "next/server";
import { getCdnConfig, USER_AGENT } from "@/lib/nhentai";
import {
  MAX_MEDIA_BYTES,
  parseMediaPath,
  pickServer,
  type MediaKind,
} from "@/lib/media";

export const runtime = "nodejs";

function isKind(value: string): value is MediaKind {
  return value === "i" || value === "t";
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ kind: string; path: string[] }> },
) {
  const { kind, path: segments } = await context.params;
  if (!isKind(kind) || !segments?.length) {
    return new Response("Not found", { status: 404 });
  }

  const parsed = parseMediaPath(segments.join("/"));
  if (!parsed) {
    return new Response("Not found", { status: 404 });
  }

  const cdn = await getCdnConfig();
  const servers = kind === "t" ? cdn.thumb_servers : cdn.image_servers;
  const origin = pickServer(servers, parsed.mediaId);
  const upstreamUrl = `${origin}/${parsed.path}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: { Accept: "image/*,*/*;q=0.8", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(20_000),
      next: { revalidate: 86_400 },
    });
  } catch {
    return new Response("Media unavailable", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("Media unavailable", { status: 502 });
  }

  const lengthHeader = upstream.headers.get("content-length");
  if (lengthHeader) {
    const length = Number(lengthHeader);
    if (Number.isFinite(length) && length > MAX_MEDIA_BYTES) {
      return new Response("Media too large", { status: 502 });
    }
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return new Response("Media unavailable", { status: 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
