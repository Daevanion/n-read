const HOST_RE = /^[a-z0-9-]+\.gold-usergeneratedcontent\.net$/;
const PATH_RE = /^[A-Za-z0-9/_.-]+$/;

export default {
  async fetch(request, _env, context) {
    const url = new URL(request.url);
    const parts = url.pathname.replace(/^\/+/, "").split("/");
    const host = parts[0] ?? "";
    const rest = parts.slice(1).join("/");
    if (!HOST_RE.test(host) || !PATH_RE.test(rest) || rest.includes("..")) {
      return new Response("Not found", { status: 404 });
    }

    const upstreamUrl = `https://${host}/${rest}`;
    const cache = caches.default;
    const cacheKey = new Request(upstreamUrl, { method: "GET" });
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const upstream = await fetch(upstreamUrl, {
      headers: {
        Referer: "https://hitomi.la/",
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        "User-Agent": "eronikki/0.1",
      },
      redirect: "manual",
    });
    if (!upstream.ok || !upstream.body) {
      return new Response("Not found", { status: upstream.status === 404 ? 404 : 502 });
    }
    const type = upstream.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return new Response("Not found", { status: 404 });

    const response = new Response(upstream.body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};
