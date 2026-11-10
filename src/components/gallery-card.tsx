import Link from "next/link";
import { CoverImage } from "@/components/cover-image";
import { formatCount, formatPages } from "@/lib/format";
import { mediaSrc } from "@/lib/media";
import type { GalleryListItem } from "@/lib/types";

export function GalleryCard({
  item,
  priority = false,
}: {
  item: GalleryListItem;
  priority?: boolean;
}) {
  const src = mediaSrc("t", item.thumbnail);
  const pages = item.num_pages ?? 0;
  const favs = item.num_favorites ?? 0;

  return (
    <Link
      href={`/g/${item.id}`}
      className="group flex flex-col gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="relative overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/8">
        <CoverImage
          src={src}
          alt={item.english_title}
          width={item.thumbnail_width}
          height={item.thumbnail_height}
          priority={priority}
          className="aspect-[5/7] w-full transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-linear-to-t from-black/70 to-transparent p-2 text-[11px] text-white">
          <span>{formatPages(pages)}</span>
          {favs > 0 ? <span>{formatCount(favs)}</span> : null}
        </div>
      </div>
      <p className="line-clamp-2 text-sm leading-snug text-foreground/90 group-hover:text-primary">
        {item.english_title}
      </p>
    </Link>
  );
}
