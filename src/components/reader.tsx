"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui/button";
import {
  loadReaderMode,
  recordProgress,
  saveReaderMode,
  subscribeReaderMode,
} from "@/lib/history";
import { mediaSrc } from "@/lib/media";
import { galleryHref } from "@/lib/query";
import { cn } from "@/lib/utils";
import type { GalleryDetail, PageInfo } from "@/lib/types";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Columns2Icon,
  GalleryVerticalIcon,
  XIcon,
} from "lucide-react";

export function Reader({
  gallery,
  initialPage,
}: {
  gallery: GalleryDetail;
  initialPage: number;
}) {
  const router = useRouter();
  const pages = useMemo<PageInfo[]>(
    () => gallery.pages ?? [],
    [gallery.pages],
  );
  const last = Math.max(pages.length, 1);
  const [page, setPage] = useState(() =>
    Math.min(Math.max(initialPage, 1), last),
  );
  const mode = useSyncExternalStore(
    subscribeReaderMode,
    loadReaderMode,
    () => "page" as const,
  );
  const [chrome, setChrome] = useState(true);

  const go = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 1), last);
      setPage(clamped);
      recordProgress({
        id: gallery.id,
        source: gallery.source,
        title: gallery.title.pretty,
        thumbnail: gallery.thumbnail.path,
        page: clamped,
        pages: gallery.num_pages,
        readAt: Date.now(),
      });
    },
    [gallery, last],
  );

  useEffect(() => {
    recordProgress({
      id: gallery.id,
      source: gallery.source,
      title: gallery.title.pretty,
      thumbnail: gallery.thumbnail.path,
      page,
      pages: gallery.num_pages,
      readAt: Date.now(),
    });
    if (mode === "strip") {
      document
        .getElementById(`p-${page}`)
        ?.scrollIntoView({ behavior: "instant", block: "start" });
    }
  }, [gallery, mode, page]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "d" || event.key === " ") {
        event.preventDefault();
        go(page + 1);
      } else if (event.key === "ArrowLeft" || event.key === "a") {
        event.preventDefault();
        go(page - 1);
      } else if (event.key === "Home") {
        go(1);
      } else if (event.key === "End") {
        go(last);
      } else if (event.key === "m") {
        saveReaderMode(mode === "page" ? "strip" : "page");
      } else if (event.key === "Escape") {
        router.push(galleryHref(gallery.source, gallery.id));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gallery.id, gallery.source, go, last, mode, page, router]);

  const current = pages[page - 1];
  const nextPage = pages[page];
  const preload = useMemo(
    () =>
      pages
        .slice(page, page + 2)
        .map((item) => mediaSrc("i", item.path))
        .filter(Boolean),
    [pages, page],
  );

  return (
    <div
      className="relative min-h-dvh bg-black text-paper"
      onMouseMove={() => setChrome(true)}
      onClick={() => setChrome((value) => !value)}
    >
      {preload.map((href) => (
        <link key={href} rel="preload" as="image" href={href} />
      ))}

      <div
        className={cn(
          "fixed inset-x-0 top-0 z-20 flex items-center gap-2 bg-black/80 px-3 py-2 text-sm text-paper backdrop-blur-sm transition-opacity",
          chrome ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <Link
          href={galleryHref(gallery.source, gallery.id)}
          className="inline-flex size-7 items-center justify-center rounded-lg text-paper hover:bg-white/10"
          aria-label="Close reader"
        >
          <XIcon className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{gallery.title.pretty}</p>
          <p className="text-xs text-paper/60">
            {page} / {last}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-paper hover:bg-white/10 hover:text-paper"
          onClick={() => saveReaderMode(mode === "page" ? "strip" : "page")}
        >
          {mode === "page" ? <GalleryVerticalIcon /> : <Columns2Icon />}
          <span className="hidden sm:inline">
            {mode === "page" ? "Long strip" : "Pages"}
          </span>
        </Button>
      </div>

      {mode === "strip" ? (
        <div className="mx-auto flex max-w-4xl flex-col items-center pt-14 pb-20">
          {pages.map((item) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={item.number}
              id={`p-${item.number}`}
              src={mediaSrc("i", item.path)}
              alt={`Page ${item.number}`}
              width={item.width}
              height={item.height}
              loading={item.number <= 3 ? "eager" : "lazy"}
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-auto w-full max-w-[1100px]"
            />
          ))}
        </div>
      ) : (
        <div className="flex min-h-dvh items-center justify-center px-0 pt-12 pb-16">
          <button
            type="button"
            aria-label="Previous page"
            className="absolute inset-y-0 left-0 z-10 w-[28%] cursor-w-resize bg-transparent"
            onClick={(event) => {
              event.stopPropagation();
              go(page - 1);
            }}
          />
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaSrc("i", current.path)}
              alt={`Page ${current.number}`}
              width={current.width}
              height={current.height}
              className="relative z-0 max-h-[calc(100dvh-6rem)] w-auto max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <p className="text-paper/70">This gallery has no pages.</p>
          )}
          <button
            type="button"
            aria-label="Next page"
            className="absolute inset-y-0 right-0 z-10 w-[28%] cursor-e-resize bg-transparent"
            onClick={(event) => {
              event.stopPropagation();
              go(page + 1);
            }}
          />
          {nextPage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaSrc("i", nextPage.path)}
              alt=""
              className="hidden"
            />
          ) : null}
        </div>
      )}

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-20 flex items-center gap-3 bg-black/80 px-3 py-2 backdrop-blur-sm transition-opacity",
          chrome ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-paper hover:bg-white/10 hover:text-paper"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
        >
          <ChevronLeftIcon />
        </Button>
        <input
          type="range"
          min={1}
          max={last}
          value={page}
          onChange={(event) => go(Number(event.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-primary"
          aria-label="Page"
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-paper hover:bg-white/10 hover:text-paper"
          disabled={page >= last}
          onClick={() => go(page + 1)}
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
