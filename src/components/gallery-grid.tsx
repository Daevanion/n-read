import { GalleryCard } from "@/components/gallery-card";
import type { GalleryListItem } from "@/lib/types";

export function GalleryGrid({ items }: { items: GalleryListItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item, index) => (
        <GalleryCard key={item.id} item={item} priority={index < 5} />
      ))}
    </div>
  );
}
