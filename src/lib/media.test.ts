import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hitomiPublicSrc,
  isAllowedCdnOrigin,
  mediaSrc,
  parseMediaPath,
  pickServer,
} from "@/lib/media";

test("accepts gallery media paths and rejects anything else", () => {
  assert.deepEqual(parseMediaPath("galleries/9/1.jpg"), {
    mediaId: "9",
    file: "1.jpg",
    path: "galleries/9/1.jpg",
  });
  assert.deepEqual(parseMediaPath("/galleries/4300532/thumb.webp"), {
    mediaId: "4300532",
    file: "thumb.webp",
    path: "galleries/4300532/thumb.webp",
  });
  assert.equal(parseMediaPath("galleries/9/../secret.jpg"), null);
  assert.equal(parseMediaPath("https://evil.example/x"), null);
  assert.equal(parseMediaPath("galleries/abc/1.jpg"), null);
  assert.equal(parseMediaPath(""), null);
});

test("builds a direct CDN URL and rejects unsafe paths", () => {
  const thumb = mediaSrc("t", "galleries/9/thumb.jpg");
  assert.match(thumb, /^https:\/\/t[1-4]\.nhentai\.net\/galleries\/9\/thumb\.jpg$/);
  assert.equal(mediaSrc("t", "galleries/9/thumb.jpg"), thumb);
  assert.match(
    mediaSrc("i", "galleries/4304843/1.webp"),
    /^https:\/\/i[1-4]\.nhentai\.net\/galleries\/4304843\/1\.webp$/,
  );
  assert.equal(mediaSrc("i", "../etc/passwd"), "");
  assert.equal(
    hitomiPublicSrc(
      "https://w1.gold-usergeneratedcontent.net/1794/abc.webp",
    ),
    "/api/hitomi-image/w1.gold-usergeneratedcontent.net/1794/abc.webp",
  );
  assert.equal(hitomiPublicSrc("https://evil.example/abc.webp"), null);
  assert.equal(
    mediaSrc("i", "https://i2.nhentai.net/galleries/9/1.webp"),
    "https://i2.nhentai.net/galleries/9/1.webp",
  );
});

test("picks a stable CDN host from the media id", () => {
  const servers = [
    "https://i1.nhentai.net",
    "https://i2.nhentai.net",
    "https://i3.nhentai.net",
    "https://i4.nhentai.net",
  ];
  const a = pickServer(servers, "9");
  const b = pickServer(servers, "9");
  assert.equal(a, b);
  assert.equal(servers.includes(a), true);
  assert.equal(isAllowedCdnOrigin(a, "i"), true);
  assert.equal(isAllowedCdnOrigin("https://evil.example", "i"), false);
});
