import Link from "next/link";
import { Suspense } from "react";
import { SearchForm } from "@/components/search-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShuffleIcon } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="h-6 w-1.5 rounded-full bg-primary" />
          <span className="font-heading text-xl italic tracking-tight">
            eronikki
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <Suspense fallback={<div className="h-9 rounded-lg bg-card" />}>
            <SearchForm />
          </Suspense>
        </div>
        <Link
          href="/random"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <ShuffleIcon data-icon="inline-start" />
          <span className="hidden sm:inline">Random</span>
        </Link>
      </div>
    </header>
  );
}
