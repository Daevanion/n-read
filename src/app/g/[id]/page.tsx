import { notFound } from "next/navigation";
import { ErrorState } from "@/components/empty-state";
import { GalleryDetailView } from "@/components/gallery-detail";
import { errorMessage, NhentaiError } from "@/lib/errors";
import { getGallery } from "@/lib/nhentai";
import { parseGalleryId } from "@/lib/query";
import type { GalleryDetail } from "@/lib/types";
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
    const gallery = await getGallery(id);
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
  if (!id) notFound();

  let gallery: GalleryDetail | null = null;
  let error: unknown = null;
  try {
    gallery = await getGallery(id);
  } catch (err) {
    error = err;
  }

  if (gallery) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <GalleryDetailView gallery={gallery} />
      </main>
    );
  }

  if (error instanceof NhentaiError && error.status === 404) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <ErrorState
          title="This gallery is not available"
          body="It may have been removed, or eronikki hides it because of its tags."
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <ErrorState title="Could not open this gallery" body={errorMessage(error)} />
    </main>
  );
}
