import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function pagesAround(current: number, total: number): (number | "gap")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const set = new Set<number>([1, total, current - 1, current, current + 1]);
  const nums = [...set]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  for (const n of nums) {
    const prev = result[result.length - 1];
    if (typeof prev === "number" && n - prev > 1) result.push("gap");
    result.push(n);
  }
  return result;
}

export function PaginationBar({
  page,
  numPages,
  hrefFor,
}: {
  page: number;
  numPages: number;
  hrefFor: (page: number) => string;
}) {
  if (numPages <= 1) return null;
  const safePage = Math.min(Math.max(page, 1), numPages);
  const items = pagesAround(safePage, numPages);

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      <Link
        href={hrefFor(Math.max(1, safePage - 1))}
        aria-disabled={safePage <= 1}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          safePage <= 1 && "pointer-events-none opacity-40",
        )}
      >
        Previous
      </Link>
      {items.map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-current={item === safePage ? "page" : undefined}
            className={cn(
              buttonVariants({
                variant: item === safePage ? "default" : "ghost",
                size: "sm",
              }),
              "min-w-8",
            )}
          >
            {item}
          </Link>
        ),
      )}
      <Link
        href={hrefFor(Math.min(numPages, safePage + 1))}
        aria-disabled={safePage >= numPages}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          safePage >= numPages && "pointer-events-none opacity-40",
        )}
      >
        Next
      </Link>
    </nav>
  );
}
