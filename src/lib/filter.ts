import type { GalleryDetail, GalleryListItem, Tag } from "@/lib/types";

/** nhentai tag IDs for content this reader will not display. */
export const BLOCKED_TAG_IDS = new Set<number>([
  19440, // lolicon
  32341, // shotacon
  159421, // toddlercon
  14362, // low lolicon
  27598, // low shotacon
]);

const BLOCKED_TITLE = /\b(lolicon|shotacon|toddlercon|loli|shota)\b/i;

export function titleLooksBlocked(title: string | null | undefined): boolean {
  if (!title) return false;
  return BLOCKED_TITLE.test(title);
}

export function tagIdsAreBlocked(tagIds: Iterable<number> | undefined): boolean {
  if (!tagIds) return false;
  for (const id of tagIds) {
    if (BLOCKED_TAG_IDS.has(id)) return true;
  }
  return false;
}

export function tagsAreBlocked(tags: Tag[] | undefined): boolean {
  if (!tags) return false;
  return tags.some((tag) => BLOCKED_TAG_IDS.has(tag.id));
}

export function listItemIsBlocked(item: GalleryListItem): boolean {
  return (
    tagIdsAreBlocked(item.tag_ids) ||
    titleLooksBlocked(item.english_title) ||
    titleLooksBlocked(item.japanese_title)
  );
}

export function galleryIsBlocked(gallery: GalleryDetail): boolean {
  return (
    tagsAreBlocked(gallery.tags) ||
    titleLooksBlocked(gallery.title.english) ||
    titleLooksBlocked(gallery.title.japanese) ||
    titleLooksBlocked(gallery.title.pretty)
  );
}

export function rejectBlockedItems(items: GalleryListItem[]): GalleryListItem[] {
  return items.filter((item) => !listItemIsBlocked(item));
}
