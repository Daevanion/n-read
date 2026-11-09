import Link from "next/link";
import { CoverImage } from "@/components/cover-image";
import { GalleryGrid } from "@/components/gallery-grid";
import { ReadButton } from "@/components/read-button";
import { Badge } from "@/components/ui/badge";
import { formatCount, formatPages, formatUploaded } from "@/lib/format";
import { mediaProxySrc } from "@/lib/media";
import { searchHref } from "@/lib/query";
import { formatClause } from "@/lib/tag-query";
import type { GalleryDetail as Gallery, Tag } from "@/lib/types";

const TAG_ORDER = [
  "language",
  "category",
  "artist",
  "group",
  "parody",
  "character",
  "tag",
];

function groupTags(tags: Tag[]): { type: string; tags: Tag[] }[] {
  const map = new Map<string, Tag[]>();
  for (const tag of tags) {
    const list = map.get(tag.type) ?? [];
    list.push(tag);
    map.set(tag.type, list);
  }
  const ordered = TAG_ORDER.filter((type) => map.has(type)).map((type) => ({
    type,
    tags: map.get(type) ?? [],
  }));
  for (const [type, list] of map) {
    if (!TAG_ORDER.includes(type)) ordered.push({ type, tags: list });
  }
  return ordered;
}

export function GalleryDetailView({ gallery }: { gallery: Gallery }) {
  const grouped = groupTags(gallery.tags ?? []);
  const cover = mediaProxySrc("i", gallery.cover.path);

  return (
    <article className="space-y-10">
      <div className="grid gap-8 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr]">
        <CoverImage
          src={cover}
          alt={gallery.title.pretty}
          width={gallery.cover.width}
          height={gallery.cover.height}
          priority
          className="mx-auto w-full max-w-[260px] rounded-xl ring-1 ring-foreground/10 md:mx-0"
        />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">#{gallery.id}</p>
          <h1 className="font-heading mt-1 text-3xl leading-tight italic sm:text-4xl">
            {gallery.title.pretty}
          </h1>
          {gallery.title.english !== gallery.title.pretty ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {gallery.title.english}
            </p>
          ) : null}
          {gallery.title.japanese ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {gallery.title.japanese}
            </p>
          ) : null}

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Pages</dt>
              <dd>{formatPages(gallery.num_pages)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Favorites</dt>
              <dd>{formatCount(gallery.num_favorites)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Uploaded</dt>
              <dd>{formatUploaded(gallery.upload_date)}</dd>
            </div>
          </dl>

          <div className="mt-6">
            <ReadButton id={gallery.id} pages={gallery.num_pages} />
          </div>

          <div className="mt-8 space-y-4">
            {grouped.map((group) => (
              <div key={group.type}>
                <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {group.type}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      render={
                        <Link
                          href={searchHref({
                            q: formatClause({
                              type: tag.type,
                              value: tag.slug,
                              mode: "include",
                            }),
                          })}
                        />
                      }
                    >
                      {tag.name}
                      <span className="text-muted-foreground">
                        {formatCount(tag.count)}
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {gallery.pages?.length ? (
        <section className="space-y-3">
          <h2 className="font-heading text-2xl italic">Pages</h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {gallery.pages.map((page) => (
              <Link
                key={page.number}
                href={`/g/${gallery.id}/read?p=${page.number}`}
                className="overflow-hidden rounded-md ring-1 ring-foreground/8 hover:ring-primary"
              >
                <CoverImage
                  src={mediaProxySrc("t", page.thumbnail)}
                  alt={`Page ${page.number}`}
                  width={page.thumbnail_width}
                  height={page.thumbnail_height}
                  className="aspect-[5/7] w-full"
                />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {gallery.related && gallery.related.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-heading text-2xl italic">Related</h2>
          <GalleryGrid items={gallery.related} />
        </section>
      ) : null}
    </article>
  );
}
