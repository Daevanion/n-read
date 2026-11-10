import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { assertCacheKey, createDiskStore } from "@/lib/store";

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

test("rejects cache keys that leave the storage root", () => {
  assert.throws(() => assertCacheKey("../secret"));
  assert.throws(() => assertCacheKey("nhentai/../secret"));
  assert.throws(() => assertCacheKey("has space"));
});
