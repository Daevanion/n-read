import { ContinueReading } from "@/components/continue-reading";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { GalleryGrid } from "@/components/gallery-grid";
import { PaginationBar } from "@/components/pagination-bar";
import { PopularRow } from "@/components/popular-row";
import { errorMessage } from "@/lib/errors";
import { getPopular, listGalleries } from "@/lib/nhentai";
import { parsePage } from "@/lib/query";
import type { GalleryListItem, PaginatedGalleries } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; random?: string }>;
}) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const randomFailed = params.random === "failed";

  let newestError: string | null = null;
  let popularError: string | null = null;
  let newest: PaginatedGalleries = { result: [], num_pages: 1, total: 0 };
  let popular: GalleryListItem[] = [];

  try {
    newest = await listGalleries(page, 25);
  } catch (error) {
    newestError = errorMessage(error);
  }

  try {
    popular = await getPopular();
  } catch (error) {
    popularError = errorMessage(error);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">
          Manga reader
        </p>
        <h1 className="font-heading text-4xl italic sm:text-5xl">Newest spreads</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Browse live galleries from nhentai, search with tag syntax like{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-foreground">
            language:english
          </code>
          , then read in a full-page viewer. Galleries tagged lolicon,
          shotacon, kodomo, toddlercon, or the related tags are hidden.
        </p>
      </div>

      <FilterBar query="" sort="date" showSort={false} />
      {randomFailed ? (
        <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          Random did not land on an available gallery. Try the button again.
        </p>
      ) : null}
      <ContinueReading />

      {page === 1 && popular.length > 0 ? <PopularRow items={popular} /> : null}
      {page === 1 && popularError && popular.length === 0 ? (
        <p className="text-sm text-muted-foreground">{popularError}</p>
      ) : null}

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-heading text-2xl italic">Newest</h2>
          {newest.total ? (
            <p className="text-xs text-muted-foreground">
              {newest.total.toLocaleString()} galleries
            </p>
          ) : null}
        </div>
        {newestError ? (
          <ErrorState body={newestError} />
        ) : newest.result.length === 0 ? (
          <EmptyState
            title="Nothing on this page"
            body="The newest list came back empty after filtering. Try another page or a language chip."
          />
        ) : (
          <>
            <GalleryGrid items={newest.result} />
            <PaginationBar
              page={page}
              numPages={newest.num_pages}
              hrefFor={(next) => (next <= 1 ? "/" : `/?page=${next}`)}
            />
          </>
        )}
      </section>
    </main>
  );
}
