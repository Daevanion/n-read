import Link from "next/link";
import { CoverImage } from "@/components/cover-image";
import { formatCount } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import { galleryHref } from "@/lib/query";
import type { GalleryListItem } from "@/lib/types";

export function PopularRow({ items }: { items: GalleryListItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-heading text-2xl italic">Popular today</h2>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
        {items.slice(0, 5).map((item) => (
          <Link
            key={`${item.source ?? "nhentai"}-${item.id}`}
            href={galleryHref(item.source, item.id)}
            className="w-40 shrink-0 sm:w-auto"
          >
            <CoverImage
              src={mediaSrc("t", item.thumbnail)}
              alt={item.english_title}
              width={item.thumbnail_width}
              height={item.thumbnail_height}
              priority
              className="aspect-[5/7] w-full rounded-lg ring-1 ring-foreground/8"
            />
            <p className="mt-2 line-clamp-2 text-sm leading-snug">
              {item.english_title}
            </p>
            {item.source === "hitomi" ? null : (
              <p className="text-[11px] text-muted-foreground">
                {formatCount(item.num_favorites)} favorites
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
