import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { GalleryGrid } from "@/components/gallery-grid";
import { PaginationBar } from "@/components/pagination-bar";
import { errorMessage, NhentaiError } from "@/lib/errors";
import { getTagBySlug, listTagged } from "@/lib/nhentai";
import {
  isTagType,
  parsePage,
  parseSort,
  searchHref,
  tagHref,
} from "@/lib/query";
import { formatClause } from "@/lib/tag-query";
import type { PaginatedGalleries } from "@/lib/types";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; slug: string }>;
}): Promise<Metadata> {
  const { type, slug } = await params;
  try {
    const tag = await getTagBySlug(type, slug);
    return { title: tag.name };
  } catch {
    return { title: slug };
  }
}

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const { type, slug } = await params;
  const query = await searchParams;
  if (!isTagType(type) || !/^[a-z0-9-]+$/i.test(slug)) notFound();

  const sort = parseSort(query.sort);
  const page = parsePage(query.page);

  let tagName = slug.replace(/-/g, " ");
  let error: string | null = null;
  let data: PaginatedGalleries = { result: [], num_pages: 1, total: 0 };

  try {
    const tag = await getTagBySlug(type, slug);
    tagName = tag.name;
    data = await listTagged(tag.id, page, sort);
  } catch (err) {
    if (err instanceof NhentaiError && err.status === 404) notFound();
    error = errorMessage(err);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          {type}
        </p>
        <h1 className="font-heading text-4xl italic">{tagName}</h1>
        {data.total != null && !error ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {data.total.toLocaleString()} galleries
          </p>
        ) : null}
        <p className="mt-3">
          <Link
            href={searchHref({
              q: formatClause({ type, value: slug, mode: "include" }),
              sort,
            })}
            className="text-sm text-primary underline-offset-2 hover:underline"
          >
            Combine this tag with others
          </Link>
        </p>
      </div>
      <FilterBar
        query=""
        sort={sort}
        showLanguages={false}
        sortBase={(next) => tagHref(type, slug, { sort: next })}
      />
      {error ? (
        <ErrorState title="Could not load this tag" body={error} />
      ) : data.result.length === 0 ? (
        <EmptyState
          title="No galleries for this tag"
          body="Nothing left on this page after filtering, or the tag is empty."
        />
      ) : (
        <>
          <GalleryGrid items={data.result} />
          <PaginationBar
            page={page}
            numPages={data.num_pages}
            hrefFor={(next) => tagHref(type, slug, { sort, page: next })}
          />
        </>
      )}
    </main>
  );
}
