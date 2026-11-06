import { notFound } from "next/navigation";
import { ErrorState } from "@/components/empty-state";
import { Reader } from "@/components/reader";
import { errorMessage, NhentaiError } from "@/lib/errors";
import { getGallery } from "@/lib/nhentai";
import { parseGalleryId, parsePage } from "@/lib/query";
import type { GalleryDetail } from "@/lib/types";
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
    const gallery = await getGallery(id);
    return { title: `Read ${gallery.title.pretty}` };
  } catch {
    return { title: "Reader" };
  }
}

export default async function ReadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const id = parseGalleryId((await params).id);
  if (!id) notFound();
  const page = parsePage((await searchParams).p, 1);

  let gallery: GalleryDetail | null = null;
  let error: unknown = null;
  try {
    gallery = await getGallery(id);
  } catch (err) {
    error = err;
  }

  if (gallery) return <Reader gallery={gallery} initialPage={page} />;
  if (error instanceof NhentaiError && error.status === 404) notFound();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <ErrorState title="Could not open the reader" body={errorMessage(error)} />
    </main>
  );
}
