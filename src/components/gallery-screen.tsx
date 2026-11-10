import { notFound } from "next/navigation";
import { ErrorState } from "@/components/empty-state";
import { GalleryDetailView } from "@/components/gallery-detail";
import { errorMessage, NhentaiError } from "@/lib/errors";
import { getHitomiGallery } from "@/lib/hitomi";
import { getGallery } from "@/lib/nhentai";
import type { CatalogSource, GalleryDetail } from "@/lib/types";

export async function loadGallery(
  source: CatalogSource,
  id: number,
): Promise<GalleryDetail> {
  return source === "hitomi" ? getHitomiGallery(id) : getGallery(id);
}

export async function GalleryScreen({
  source,
  id,
}: {
  source: CatalogSource;
  id: number | null;
}) {
  if (!id) notFound();

  let gallery: GalleryDetail | null = null;
  let error: unknown = null;
  try {
    gallery = await loadGallery(source, id);
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
