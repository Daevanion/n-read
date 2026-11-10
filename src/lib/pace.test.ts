import assert from "node:assert/strict";
import { test } from "node:test";
import { createPacer, endpointBucket } from "@/lib/pace";

test("classifies nhentai paths into separate buckets", () => {
  assert.equal(endpointBucket("/search?query=a"), "search");
  assert.equal(endpointBucket("/galleries/tagged?tag_id=1"), "tagged");
  assert.equal(endpointBucket("/galleries/popular"), "popular");
  assert.equal(endpointBucket("/galleries/random"), "random");
  assert.equal(endpointBucket("/galleries/123?include=related"), "gallery");
  assert.equal(endpointBucket("/galleries?page=1"), "galleries");
  assert.equal(endpointBucket("/tags/search", "POST"), "tagsSearch");
  assert.equal(endpointBucket("/tags/language"), "tags");
  assert.equal(endpointBucket("/cdn"), "cdn");
});

test("spends a full bucket immediately, then asks later calls to wait", () => {
  let now = 1_000;
  const pacer = createPacer(() => now);
  assert.equal(pacer.reserve("search", 2), 0);
  assert.equal(pacer.reserve("search", 2), 0);
  const wait = pacer.reserve("search", 2);
  assert.equal(wait, 30_000);
  now += 60_000;
  assert.equal(pacer.reserve("search", 2), 0);
});

test("one endpoint does not drain another", () => {
  const pacer = createPacer(() => 0);
  assert.equal(pacer.reserve("gallery", 1), 0);
  assert.equal(pacer.reserve("search", 1), 0);
  assert.ok(pacer.reserve("gallery", 1) > 0);
});
