"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { searchHref } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { CatalogSource } from "@/lib/types";
import { ShuffleIcon, TagsIcon } from "lucide-react";

export function useCatalogSource(): CatalogSource {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pathname.startsWith("/h/") || params.get("source") === "hitomi") return "hitomi";
  return "nhentai";
}

export function SourceSwitch() {
  const source = useCatalogSource();
  return (
    <div className="mx-auto flex w-full max-w-6xl items-center gap-1.5 px-4 py-2 sm:px-6">
      <span className="mr-1 text-[11px] tracking-wide text-muted-foreground uppercase">
        Library
      </span>
      <Link
        href="/"
        className={chip(source === "nhentai")}
        aria-current={source === "nhentai" ? "page" : undefined}
      >
        nhentai
      </Link>
      <Link
        href="/?source=hitomi"
        className={chip(source === "hitomi")}
        aria-current={source === "hitomi" ? "page" : undefined}
      >
        Hitomi
      </Link>
    </div>
  );
}

export function HeaderActions() {
  const source = useCatalogSource();
  return (
    <>
      <Link
        href={searchHref({ source })}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        <TagsIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Tags</span>
      </Link>
      <Link
        href={source === "hitomi" ? "/random?source=hitomi" : "/random"}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <ShuffleIcon data-icon="inline-start" />
        <span className="hidden sm:inline">Random</span>
      </Link>
    </>
  );
}

function chip(active: boolean) {
  return cn(
    "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-muted-foreground hover:text-foreground",
  );
}
