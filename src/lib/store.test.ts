import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createServer } from "node:http";
import { assertCacheKey, createDiskStore, createHttpStore } from "@/lib/store";

test("round-trips a catalog object on disk", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "eronikki-cache-"));
  try {
    const store = createDiskStore(root);
    assert.equal(await store.read("nhentai/gallery/9"), null);
    await store.write("nhentai/gallery/9", "{\"ok\":true}");
    assert.equal(await store.read("nhentai/gallery/9"), "{\"ok\":true}");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("sends catalog JSON to the remote store with the bearer token", async () => {
  let auth = "";
  const files = new Map<string, string>();
  const server = createServer((req, res) => {
    auth = req.headers.authorization ?? "";
    const key = decodeURIComponent((req.url ?? "/").replace(/^\/+/, ""));
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (req.method === "PUT") {
        files.set(key, Buffer.concat(chunks).toString("utf8"));
        res.writeHead(200);
        res.end("ok");
        return;
      }
      const saved = files.get(key);
      res.writeHead(saved ? 200 : 404);
      res.end(saved ?? "");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("no port");
  try {
    const store = createHttpStore(`http://127.0.0.1:${address.port}`, "test-token");
    await store.write("nhentai/gallery/9", "{\"ok\":true}");
    assert.equal(auth, "Bearer test-token");
    assert.equal(await store.read("nhentai/gallery/9"), "{\"ok\":true}");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("rejects cache keys that leave the storage root", () => {
  assert.throws(() => assertCacheKey("../secret"));
  assert.throws(() => assertCacheKey("nhentai/../secret"));
  assert.throws(() => assertCacheKey("has space"));
});
