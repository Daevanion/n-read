import { createHash } from "node:crypto";
import { cache } from "react";
import { catalogGet } from "@/lib/catalog-cache";
import { NhentaiError } from "@/lib/errors";
import { galleryIsBlocked, rejectBlockedItems, tagLooksBlocked } from "@/lib/filter";
import { hitomiPageIsSafe, splitHitomiQuery } from "@/lib/hitomi-query";
import type {
  GalleryDetail,
  GalleryListItem,
  PaginatedGalleries,
  SortOption,
  Tag,
} from "@/lib/types";
import { Hitomi, SortType, Extension, ThumbnailSize } from "node-hitomi";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

type HitomiTag = { type: string; name: string };
type HitomiFile = {
  width: number;
  height: number;
  hasThumbnail: boolean;
  resolveUrl(extension: string, thumbnailSize?: string): Promise<string>;
};
type HitomiGallery = {
  id: number;
  title: { display: string; japanese: string | null };
  type: string;
  language: { name: string } | null;
  artists: readonly HitomiTag[];
  groups: readonly HitomiTag[];
  series: readonly HitomiTag[];
  characters: readonly HitomiTag[];
  tags: readonly HitomiTag[];
  files: readonly HitomiFile[];
  relations: readonly { id: number }[];
  isBlocked: boolean;
  addedDate: Date;
};

type StoredGallery = GalleryDetail & {
  relationIds: number[];
  unavailable?: boolean;
};

const DAY_STALE = 24 * HOUR;

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

let client: Hitomi | null = null;

function hitomiClient(): Hitomi {
  if (!client) {
    client = new Hitomi({
      indexMaximumAge: 10 * MINUTE,
      imageContextMaximumAge: 30 * MINUTE,
    });
  }
  return client;
}

function sortType(sort: SortOption): SortType {
  if (sort === "popular-today") return SortType.PopularityDay;
  if (sort === "popular-week") return SortType.PopularityWeek;
  if (sort === "popular" || sort === "popular-month") return SortType.PopularityMonth;
  return SortType.DateAdded;
}

function absolute(url: string): string {
  return url.startsWith("//") ? `https:${url}` : url;
}

function tagId(type: string, name: string): number {
  let hash = 0;
  for (const char of `${type}:${name}`) {
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  }
  const id = Math.abs(hash);
  return id === 0 ? 1 : id;
}

function mapTag(tag: HitomiTag, count = 0): Tag {
  const type =
    tag.type === "series" ? "parody" : tag.type === "type" ? "category" : tag.type;
  return {
    id: tagId(type, tag.name),
    type,
    name: tag.name.replaceAll("_", " "),
    slug: tag.name,
    url: "",
    count,
  };
}

async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await run(items[index]);
    }
  }
  const workers = Math.min(Math.max(limit, 1), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

function toListItem(gallery: GalleryDetail): GalleryListItem {
  return {
    id: gallery.id,
    source: "hitomi",
    media_id: gallery.media_id,
    english_title: gallery.title.english,
    japanese_title: gallery.title.japanese,
    thumbnail: gallery.thumbnail.path,
    thumbnail_width: gallery.thumbnail.width,
    thumbnail_height: gallery.thumbnail.height,
    num_pages: gallery.num_pages,
    num_favorites: 0,
  };
}

async function fileUrls(file: HitomiFile): Promise<{ thumb: string; full: string }> {
  const thumb = absolute(
    await file.resolveUrl(
      Extension.Webp,
      file.hasThumbnail ? ThumbnailSize.Big : ThumbnailSize.Small,
    ),
  );
  const full = absolute(await file.resolveUrl(Extension.Webp));
  return { thumb, full };
}

async function loadHitomiGallery(id: number, full: boolean): Promise<StoredGallery> {
  let gallery: HitomiGallery;
  try {
    gallery = (await hitomiClient().galleries.retrieve(id)) as unknown as HitomiGallery;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hitomi did not respond.";
    throw new NhentaiError(message, 502);
  }
  const files = gallery.files ?? [];
  const wanted = full ? files : files.slice(0, 1);
  const urls = await mapLimited(wanted, 6, (file) => fileUrls(file));
  const first = urls[0];
  const tags = [
    ...(gallery.language ? [mapTag({ type: "language", name: gallery.language.name })] : []),
    mapTag({ type: "type", name: gallery.type }),
    ...gallery.artists.map((tag) => mapTag(tag)),
    ...gallery.groups.map((tag) => mapTag(tag)),
    ...gallery.series.map((tag) => mapTag(tag)),
    ...gallery.characters.map((tag) => mapTag(tag)),
    ...gallery.tags.map((tag) => mapTag(tag)),
  ];
  const title = gallery.title.display || `Gallery ${id}`;
  return {
    id: gallery.id,
    source: "hitomi",
    media_id: String(gallery.id),
    title: { english: title, japanese: gallery.title.japanese, pretty: title },
    cover: {
      path: first?.full ?? "",
      width: files[0]?.width ?? 0,
      height: files[0]?.height ?? 0,
    },
    thumbnail: {
      path: first?.thumb ?? first?.full ?? "",
      width: files[0]?.width ?? 0,
      height: files[0]?.height ?? 0,
    },
    upload_date: Math.floor(gallery.addedDate.getTime() / 1000),
    tags,
    num_pages: files.length,
    num_favorites: 0,
    pages: full
      ? files.map((file, index) => ({
          number: index + 1,
          path: urls[index]?.full ?? "",
          width: file.width,
          height: file.height,
          thumbnail: urls[index]?.thumb ?? "",
          thumbnail_width: file.width,
          thumbnail_height: file.height,
        }))
      : [],
    related: [],
    relationIds: gallery.isBlocked ? [] : gallery.relations.slice(0, 6).map((item) => item.id),
    unavailable: gallery.isBlocked,
  };
}

function unavailable(gallery: StoredGallery): boolean {
  return Boolean(gallery.unavailable) || galleryIsBlocked(gallery);
}

async function readStored(id: number): Promise<StoredGallery> {
  return catalogGet(`hitomi/gallery/${id}`, 2 * HOUR, DAY_STALE, () =>
    loadHitomiGallery(id, true),
  );
}

async function readCard(id: number): Promise<StoredGallery> {
  return catalogGet(`hitomi/card/${id}`, 2 * HOUR, DAY_STALE, () =>
    loadHitomiGallery(id, false),
  );
}

export const getHitomiGallery = cache(async function getHitomiGallery(
  id: number,
): Promise<GalleryDetail> {
  const stored = await readStored(id);
  if (unavailable(stored)) {
    throw new NhentaiError("This gallery is not available in eronikki.", 404);
  }
  const related = (
    await mapLimited(stored.relationIds ?? [], 3, async (relationId) => {
      try {
        const item = await readCard(relationId);
        if (unavailable(item)) return null;
        return toListItem(item);
      } catch {
        return null;
      }
    })
  ).filter((item): item is GalleryListItem => item !== null);
  return {
    id: stored.id,
    source: stored.source,
    media_id: stored.media_id,
    title: stored.title,
    cover: stored.cover,
    thumbnail: stored.thumbnail,
    upload_date: stored.upload_date,
    tags: stored.tags,
    num_pages: stored.num_pages,
    num_favorites: stored.num_favorites,
    pages: stored.pages,
    related: rejectBlockedItems(related),
  };
});

async function cardsFromRefs(
  refs: readonly { id: number }[],
): Promise<GalleryListItem[]> {
  const details = await mapLimited(refs, 4, async (ref) => {
    try {
      const stored = await readCard(ref.id);
      if (unavailable(stored)) return null;
      return toListItem(stored);
    } catch {
      return null;
    }
  });
  return rejectBlockedItems(
    details.filter((item): item is GalleryListItem => item !== null),
  );
}

export async function listHitomi(
  page = 1,
  sort: SortOption = "date",
  size = 25,
): Promise<PaginatedGalleries> {
  const perPage = Math.min(Math.max(size, 1), 25);
  return catalogGet(`hitomi/list/${sort}/${page}/${perPage}`, MINUTE, 15 * MINUTE, async () => {
    const refs = await hitomiClient().galleries.list({
      orderBy: sortType(sort),
      page: { index: Math.max(page - 1, 0), size: perPage },
    });
    return {
      result: await cardsFromRefs(refs),
      num_pages: refs.length >= perPage ? page + 1 : page,
      total: null,
    };
  });
}

export async function searchHitomi(
  query: string,
  page = 1,
  sort: SortOption = "date",
): Promise<PaginatedGalleries> {
  const { expression, title } = splitHitomiQuery(query);
  return catalogGet(
    `hitomi/search/${digest(`${expression}\n${title}\n${sort}\n${page}`)}`,
    2 * MINUTE,
    30 * MINUTE,
    async () => {
      const tags = expression ? hitomiClient().tags.parse(expression) : undefined;
      const orderBy = sortType(sort);
      const paged = hitomiPageIsSafe(expression, title);
      let refs: { id: number }[];
      try {
        refs = await hitomiClient().galleries.list(
          paged
            ? {
                tags,
                title: title || undefined,
                orderBy,
                page: { index: page - 1, size: 25 },
              }
            : { tags, title: title || undefined, orderBy },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Hitomi search failed.";
        throw new NhentaiError(message, 502);
      }
      const slice = paged ? refs : refs.slice((page - 1) * 25, page * 25);
      return {
        result: await cardsFromRefs(slice),
        num_pages: paged
          ? refs.length >= 25
            ? page + 1
            : page
          : Math.max(1, Math.ceil(refs.length / 25)),
        total: paged ? null : refs.length,
      };
    },
  );
}

export async function randomHitomiId(): Promise<number> {
  const refs = await hitomiClient().galleries.list({
    orderBy: SortType.Random,
    page: { index: 0, size: 1 },
  });
  if (!refs[0]) throw new NhentaiError("Random gallery did not return an id.");
  return refs[0].id;
}

export async function searchHitomiTags(query: string, limit = 8): Promise<Tag[]> {
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  const rows = await catalogGet(`hitomi/tagsearch/${digest(q)}`, 10 * MINUTE, 6 * HOUR, async () => {
    const found = await hitomiClient().tags.search(q);
    return found.slice(0, limit + 8).map(([tag, count]) => mapTag(tag, count));
  });
  return rows.filter((tag) => !tagLooksBlocked(tag)).slice(0, limit);
}
