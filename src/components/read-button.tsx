"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  emptyHistory,
  loadHistory,
  subscribeHistory,
} from "@/lib/history";
import { cn } from "@/lib/utils";

export function ReadButton({ id, pages }: { id: number; pages: number }) {
  const entries = useSyncExternalStore(
    subscribeHistory,
    loadHistory,
    emptyHistory,
  );
  const saved = entries.find((entry) => entry.id === id)?.page ?? 1;
  const continuing = saved > 1 && saved <= pages;

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/g/${id}/read?p=${continuing ? saved : 1}`}
        className={cn(buttonVariants({ size: "lg" }))}
      >
        {continuing ? `Continue on page ${saved}` : "Read"}
      </Link>
      {continuing ? (
        <Link
          href={`/g/${id}/read?p=1`}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Start over
        </Link>
      ) : null}
    </div>
  );
}
