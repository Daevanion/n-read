import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BLOCKED_TAG_IDS,
  galleryIsBlocked,
  listItemIsBlocked,
  rejectBlockedItems,
  titleLooksBlocked,
} from "@/lib/filter";
import type { GalleryDetail, GalleryListItem } from "@/lib/types";

test("blocks known lolicon and shotacon tag ids", () => {
  assert.equal(BLOCKED_TAG_IDS.has(19440), true);
  assert.equal(BLOCKED_TAG_IDS.has(32341), true);
  assert.equal(
    listItemIsBlocked({
      id: 1,
      media_id: "9",
      english_title: "Ordinary title",
      japanese_title: null,
      thumbnail: "galleries/9/thumb.jpg",
      thumbnail_width: 250,
      thumbnail_height: 350,
      tag_ids: [19440, 12227],
    }),
    true,
  );
});

test("blocks titles that name disallowed tags", () => {
  assert.equal(titleLooksBlocked("[Group] Loli example"), true);
  assert.equal(titleLooksBlocked("A story about shotacon"), true);
  assert.equal(titleLooksBlocked("Lolita fashion only"), false);
  assert.equal(titleLooksBlocked("Eat The Rich!"), false);
});

test("keeps ordinary list items", () => {
  const item: GalleryListItem = {
    id: 2,
    media_id: "10",
    english_title: "[Artist] Ordinary Work [English]",
    japanese_title: null,
    thumbnail: "galleries/10/thumb.jpg",
    thumbnail_width: 250,
    thumbnail_height: 350,
    tag_ids: [12227, 33172],
  };
  assert.equal(listItemIsBlocked(item), false);
  assert.equal(rejectBlockedItems([item]).length, 1);
});

test("blocks a gallery detail by tag id", () => {
  const gallery: GalleryDetail = {
    id: 1,
    media_id: "9",
    title: { english: "Eat The Rich!", japanese: null, pretty: "Eat The Rich!" },
    cover: { path: "galleries/9/cover.jpg", width: 350, height: 500 },
    thumbnail: { path: "galleries/9/thumb.jpg", width: 250, height: 357 },
    upload_date: 1,
    tags: [
      {
        id: 19440,
        type: "tag",
        name: "lolicon",
        slug: "lolicon",
        url: "/tag/lolicon/",
        count: 1,
      },
    ],
    num_pages: 14,
    num_favorites: 1,
    pages: [],
  };
  assert.equal(galleryIsBlocked(gallery), true);
});
