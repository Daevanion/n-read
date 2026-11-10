import assert from "node:assert/strict";
import { test } from "node:test";
import { createCatalogCache } from "@/lib/catalog-cache";

test("serves a fresh value without calling the origin again", async () => {
  const files = new Map<string, string>();
  let now = 1_000;
  let loads = 0;
  const cache = createCatalogCache({
    now: () => now,
    store: {
      read: async (key) => files.get(key) ?? null,
      write: async (key, body) => {
        files.set(key, body);
      },
    },
  });
  const first = await cache.get("nhentai/gallery/1", 1_000, 5_000, async () => {
    loads += 1;
    return { id: 1 };
  });
  const second = await cache.get("nhentai/gallery/1", 1_000, 5_000, async () => {
    loads += 1;
    return { id: 2 };
  });
  assert.deepEqual(first, { id: 1 });
  assert.deepEqual(second, { id: 1 });
  assert.equal(loads, 1);
  assert.equal(files.size, 1);
});

test("returns a stale value and refreshes behind it", async () => {
  const files = new Map<string, string>();
  let now = 1_000;
  let loads = 0;
  const cache = createCatalogCache({
    now: () => now,
    store: {
      read: async (key) => files.get(key) ?? null,
      write: async (key, body) => {
        files.set(key, body);
      },
    },
  });
  await cache.get("hitomi/gallery/3", 100, 1_000, async () => {
    loads += 1;
    return "old";
  });
  now = 1_250;
  const stale = await cache.get("hitomi/gallery/3", 100, 1_000, async () => {
    loads += 1;
    return "new";
  });
  assert.equal(stale, "old");
  await new Promise((resolve) => setTimeout(resolve, 0));
  const fresh = await cache.get("hitomi/gallery/3", 100, 1_000, async () => {
    loads += 1;
    return "newer";
  });
  assert.equal(fresh, "new");
  assert.equal(loads, 2);
});
