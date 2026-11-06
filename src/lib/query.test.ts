import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isTagType,
  parseGalleryId,
  parsePage,
  parseQuery,
  parseSort,
  searchHref,
  tagHref,
} from "@/lib/query";

test("parses paging, sort, and query bounds", () => {
  assert.equal(parsePage("3"), 3);
  assert.equal(parsePage("0"), 1);
  assert.equal(parsePage("nope"), 1);
  assert.equal(parseSort("popular-week"), "popular-week");
  assert.equal(parseSort("newest"), "date");
  assert.equal(parseQuery("  language:english  "), "language:english");
  assert.equal(parseQuery("x".repeat(500)).length, 200);
});

test("only accepts numeric gallery ids in range", () => {
  assert.equal(parseGalleryId("177013"), 177013);
  assert.equal(parseGalleryId("0"), null);
  assert.equal(parseGalleryId("-1"), null);
  assert.equal(parseGalleryId("12abc"), null);
});

test("builds search and tag hrefs", () => {
  assert.equal(searchHref({ q: "language:english" }), "/search?q=language%3Aenglish");
  assert.equal(
    searchHref({ q: "cat", sort: "popular", page: 2 }),
    "/search?q=cat&sort=popular&page=2",
  );
  assert.equal(searchHref({ q: "", sort: "date", page: 1 }), "/search");
  assert.equal(tagHref("artist", "shindol"), "/tag/artist/shindol");
  assert.equal(
    tagHref("language", "english", { sort: "popular-today", page: 3 }),
    "/tag/language/english?sort=popular-today&page=3",
  );
  assert.equal(isTagType("artist"), true);
  assert.equal(isTagType("moderation"), false);
});
