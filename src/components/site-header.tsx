import Link from "next/link";
import { Suspense } from "react";
import { LogoMark } from "@/components/logo-mark";
import { SearchForm } from "@/components/search-form";
import { HeaderActions, SourceSwitch } from "@/components/source-switch";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          aria-label="eronikki"
          className="flex shrink-0 items-center gap-2"
        >
          <LogoMark />
          <span className="font-heading hidden text-xl italic tracking-tight sm:inline">
            eronikki
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <Suspense fallback={<div className="h-9 rounded-lg bg-card" />}>
            <SearchForm />
          </Suspense>
        </div>
        <Suspense fallback={<div className="h-8 w-24" />}>
          <HeaderActions />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <SourceSwitch />
      </Suspense>
    </header>
  );
}
