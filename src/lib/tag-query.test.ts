import assert from "node:assert/strict";
import { test } from "node:test";
import {
  activeLanguage,
  buildSearchQuery,
  cycleTag,
  formatClause,
  parseSearchQuery,
  withLanguage,
} from "@/lib/tag-query";

test("splits tag clauses from leftover words", () => {
  const parsed = parseSearchQuery(
    'cat language:english tag:"big breasts" -artist:foo pages:>20',
  );
  assert.equal(parsed.text, "cat pages:>20");
  assert.deepEqual(parsed.tags, [
    { type: "language", value: "english", mode: "include" },
    { type: "tag", value: "big-breasts", mode: "include" },
    { type: "artist", value: "foo", mode: "exclude" },
  ]);
});

test("builds a query and cycles include, exclude, then off", () => {
  const included = cycleTag([], { type: "tag", value: "stockings" });
  assert.equal(formatClause(included[0]), "tag:stockings");
  const excluded = cycleTag(included, { type: "tag", value: "stockings" });
  assert.equal(excluded[0].mode, "exclude");
  assert.equal(formatClause(excluded[0]), "-tag:stockings");
  assert.deepEqual(cycleTag(excluded, { type: "tag", value: "stockings" }), []);
  assert.equal(
    buildSearchQuery("school", excluded),
    "-tag:stockings school",
  );
});

test("language chips keep the other clauses", () => {
  const query = withLanguage("tag:stockings school", "english");
  assert.equal(query, "tag:stockings language:english school");
  assert.equal(activeLanguage(query), "english");
  assert.equal(withLanguage(query, null), "tag:stockings school");
  assert.equal(activeLanguage("tag:maid"), "");
});
