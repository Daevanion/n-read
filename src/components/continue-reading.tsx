"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { CoverImage } from "@/components/cover-image";
import {
  emptyHistory,
  loadHistory,
  subscribeHistory,
} from "@/lib/history";
import { mediaSrc } from "@/lib/media";
import { readHref } from "@/lib/query";

export function ContinueReading() {
  const entries = useSyncExternalStore(
    subscribeHistory,
    loadHistory,
    emptyHistory,
  );

  if (entries.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="font-heading text-2xl italic">Continue</h2>
        <p className="text-xs text-muted-foreground">Saved on this device</p>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-0 sm:px-0">
        {entries.map((entry) => (
          <Link
            key={`${entry.source ?? "nhentai"}-${entry.id}`}
            href={readHref(entry.source, entry.id, entry.page)}
            className="w-28 shrink-0 sm:w-32"
          >
            <CoverImage
              src={mediaSrc("t", entry.thumbnail)}
              alt={entry.title}
              className="aspect-[5/7] w-full rounded-lg ring-1 ring-foreground/8"
            />
            <p className="mt-2 line-clamp-2 text-xs leading-snug">{entry.title}</p>
            <p className="text-[11px] text-muted-foreground">
              Page {entry.page} of {entry.pages}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
