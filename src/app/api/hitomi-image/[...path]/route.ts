const HOST_RE = /^[a-z0-9-]+\.gold-usergeneratedcontent\.net$/;
const PATH_RE = /^[A-Za-z0-9/_.-]+$/;
const MAX_BYTES = 20 * 1024 * 1024;

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const parts = (await context.params).path ?? [];
  const host = parts[0] ?? "";
  const rest = parts.slice(1).join("/");
  if (!HOST_RE.test(host) || !PATH_RE.test(rest) || rest.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`https://${host}/${rest}`, {
      headers: {
        Referer: "https://hitomi.la/",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        "User-Agent": "eronikki/0.1",
      },
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return new Response("Image host did not respond", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: 404 });
  }
  const type = upstream.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) {
    return new Response("Not found", { status: 404 });
  }
  const length = Number(upstream.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BYTES) {
    return new Response("Image is too large", { status: 413 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400",
      "CDN-Cache-Control": "public, max-age=86400",
      ...(length > 0 ? { "Content-Length": String(length) } : {}),
    },
  });
}
