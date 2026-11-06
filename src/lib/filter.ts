import type { GalleryDetail, GalleryListItem, Tag } from "@/lib/types";

/**
 * nhentai tag IDs this reader will not display.
 * These are tags for sexual content involving minors, including the
 * smaller sibling tags that do not always sit next to lolicon or shotacon.
 */
export const BLOCKED_TAG_IDS = new Set<number>([
  19440, // lolicon
  32341, // shotacon
  159421, // toddlercon
  14362, // low lolicon
  27598, // low shotacon
  25663, // oppai loli
  166714, // lolibaba
  152252, // kodomo doushi
  152505, // kodomo only
  80631, // kindergarten uniform
  31986, // age regression
]);

const BLOCKED_TEXT =
  /\b(lolicon|shotacon|toddlercon|lolibaba|kodomo|kindergarten|age[\s-]?regression)\b|\b(loli|shota)\b/i;

export function titleLooksBlocked(title: string | null | undefined): boolean {
  if (!title) return false;
  return BLOCKED_TEXT.test(title);
}

export function tagIdsAreBlocked(tagIds: Iterable<number> | undefined): boolean {
  if (!tagIds) return false;
  for (const id of tagIds) {
    if (BLOCKED_TAG_IDS.has(id)) return true;
  }
  return false;
}

export function tagLooksBlocked(tag: Pick<Tag, "id" | "name" | "slug">): boolean {
  if (BLOCKED_TAG_IDS.has(tag.id)) return true;
  return BLOCKED_TEXT.test(tag.name) || BLOCKED_TEXT.test(tag.slug.replace(/-/g, " "));
}

export function tagsAreBlocked(tags: Tag[] | undefined): boolean {
  if (!tags) return false;
  return tags.some((tag) => tagLooksBlocked(tag));
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
