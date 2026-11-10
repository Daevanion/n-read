import { GalleryScreen, loadGallery } from "@/components/gallery-screen";
import { parseGalleryId } from "@/lib/query";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = parseGalleryId((await params).id);
  if (!id) return { title: "Gallery" };
  try {
    const gallery = await loadGallery("nhentai", id);
    return { title: gallery.title.pretty };
  } catch {
    return { title: "Gallery" };
  }
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = parseGalleryId((await params).id);
  return <GalleryScreen source="nhentai" id={id} />;
}
