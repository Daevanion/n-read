import Link from "next/link";
import { LANGUAGE_FILTERS, SORT_OPTIONS, searchHref } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { SortOption } from "@/lib/types";

function chipClass(active: boolean) {
  return cn(
    "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-muted-foreground hover:text-foreground",
  );
}

export function FilterBar({
  query,
  sort,
  sortBase,
  showLanguages = true,
  showSort = true,
}: {
  query: string;
  sort: SortOption;
  sortBase?: (sort: SortOption) => string;
  showLanguages?: boolean;
  showSort?: boolean;
}) {
  const hrefForSort =
    sortBase ?? ((next: SortOption) => searchHref({ q: query, sort: next }));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {showLanguages ? (
        <div className="flex flex-wrap gap-1.5">
          {LANGUAGE_FILTERS.map((lang) => {
            const active =
              query === lang.query || (lang.query === "" && query === "");
            const href = lang.query ? searchHref({ q: lang.query, sort }) : "/";
            return (
              <Link key={lang.label} href={href} className={chipClass(active)}>
                {lang.label}
              </Link>
            );
          })}
        </div>
      ) : (
        <div />
      )}
      {showSort ? (
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={hrefForSort(option.value)}
              className={chipClass(sort === option.value)}
            >
              {option.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
