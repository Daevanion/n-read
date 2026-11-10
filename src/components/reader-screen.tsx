import { notFound } from "next/navigation";
import { ErrorState } from "@/components/empty-state";
import { loadGallery } from "@/components/gallery-screen";
import { Reader } from "@/components/reader";
import { errorMessage, NhentaiError } from "@/lib/errors";
import type { CatalogSource, GalleryDetail } from "@/lib/types";

export async function ReaderScreen({
  source,
  id,
  page,
}: {
  source: CatalogSource;
  id: number | null;
  page: number;
}) {
  if (!id) notFound();

  let gallery: GalleryDetail | null = null;
  let error: unknown = null;
  try {
    gallery = await loadGallery(source, id);
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
