import assert from "node:assert/strict";
import { test } from "node:test";
import { hitomiPageIsSafe, splitHitomiQuery } from "@/lib/hitomi-query";

test("splits Hitomi tags from title words and maps nhentai aliases", () => {
  assert.deepEqual(splitHitomiQuery("serina artist:some-name parody:blue-archive"), {
    expression: "artist:some_name series:blue_archive",
    title: "serina",
  });
  assert.equal(hitomiPageIsSafe("language:english", ""), true);
  assert.equal(hitomiPageIsSafe("female:a female:b", ""), false);
  assert.equal(hitomiPageIsSafe("language:english female:a", ""), true);
  assert.equal(hitomiPageIsSafe("-female:a", ""), false);
  assert.equal(hitomiPageIsSafe("female:a", "serina"), false);
});
