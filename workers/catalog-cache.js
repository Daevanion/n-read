const KEY_RE = /^[a-z0-9][a-z0-9/_.-]{0,180}$/;
const MAX_BYTES = 1_500_000;

export default {
  async fetch(request, env) {
    const auth = request.headers.get("authorization") ?? "";
    if (!env.CACHE_AUTH || auth !== `Bearer ${env.CACHE_AUTH}`) {
      return new Response("unauthorized", { status: 401 });
    }

    const key = decodeURIComponent(new URL(request.url).pathname.replace(/^\/+/, ""));
    if (!KEY_RE.test(key) || key.includes("..")) {
      return new Response("bad key", { status: 400 });
    }

    if (request.method === "GET") {
      const object = await env.CATALOG.get(key);
      if (!object) return new Response("missing", { status: 404 });
      return new Response(await object.text(), {
        headers: { "content-type": "application/json" },
      });
    }

    if (request.method === "PUT") {
      const body = await request.text();
      if (body.length > MAX_BYTES) return new Response("too big", { status: 413 });
      await env.CATALOG.put(key, body, {
        httpMetadata: { contentType: "application/json" },
      });
      return new Response("ok");
    }

    return new Response("method", { status: 405 });
  },
};
