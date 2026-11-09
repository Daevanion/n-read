import { Suspense } from "react";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { GalleryGrid } from "@/components/gallery-grid";
import { PaginationBar } from "@/components/pagination-bar";
import { TagTogglePanel } from "@/components/tag-toggle";
import { errorMessage } from "@/lib/errors";
import { searchGalleries } from "@/lib/nhentai";
import { parsePage, parseQuery, parseSort, searchHref } from "@/lib/query";
import type { PaginatedGalleries } from "@/lib/types";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const q = parseQuery((await searchParams).q);
  return { title: q ? `Search: ${q}` : "Search" };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = parseQuery(params.q);
  const sort = parseSort(params.sort);
  const page = parsePage(params.page);

  const panel = (
    <Suspense fallback={<div className="h-40 rounded-2xl bg-card" />}>
      <TagTogglePanel />
    </Suspense>
  );

  if (!q) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="font-heading text-4xl italic">Search</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Turn tags on or off, or type a title. You can still use nhentai
            syntax such as{" "}
            <code className="rounded bg-muted px-1 py-0.5">pages:&gt;20</code>.
          </p>
        </div>
        {panel}
        <FilterBar query="" sort={sort} />
      </main>
    );
  }

  let error: string | null = null;
  let data: PaginatedGalleries = { result: [], num_pages: 1, total: 0 };
  try {
    data = await searchGalleries(q, page, sort);
  } catch (err) {
    error = errorMessage(err);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-xs text-muted-foreground">Search</p>
        <h1 className="font-heading text-4xl italic">{q}</h1>
        {data.total != null && !error ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {data.total.toLocaleString()} matches
          </p>
        ) : null}
      </div>
      {panel}
      <FilterBar query={q} sort={sort} />
      {error ? (
        <ErrorState title="Search failed" body={error} />
      ) : data.result.length === 0 ? (
        <EmptyState
          title="No galleries matched"
          body="Try a broader query, drop a minus tag, or switch the language chip."
          actionHref="/"
          actionLabel="Browse newest"
        />
      ) : (
        <>
          <GalleryGrid items={data.result} />
          <PaginationBar
            page={page}
            numPages={data.num_pages}
            hrefFor={(next) => searchHref({ q, sort, page: next })}
          />
        </>
      )}
    </main>
  );
}
