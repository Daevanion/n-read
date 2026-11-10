import { ReaderScreen } from "@/components/reader-screen";
import { loadGallery } from "@/components/gallery-screen";
import { parseGalleryId, parsePage } from "@/lib/query";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = parseGalleryId((await params).id);
  if (!id) return { title: "Reader" };
  try {
    const gallery = await loadGallery("hitomi", id);
    return { title: `Read ${gallery.title.pretty}` };
  } catch {
    return { title: "Reader" };
  }
}

export default async function HitomiReadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const id = parseGalleryId((await params).id);
  const page = parsePage((await searchParams).p, 1);
  return <ReaderScreen source="hitomi" id={id} page={page} />;
}
