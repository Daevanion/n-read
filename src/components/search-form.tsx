"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchHref } from "@/lib/query";
import { useCatalogSource } from "@/components/source-switch";
import type { Tag } from "@/lib/types";
import { SearchIcon } from "lucide-react";

export function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = useCatalogSource();
  const urlQuery = searchParams.get("q") ?? "";
  const [q, setQ] = useState(urlQuery);
  const [prevQuery, setPrevQuery] = useState(urlQuery);
  const [fetched, setFetched] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const boxId = useId();
  const abortRef = useRef<AbortController | null>(null);

  if (urlQuery !== prevQuery) {
    setPrevQuery(urlQuery);
    setQ(urlQuery);
  }

  const term = q.trim();
  const suggestions = term.length < 2 ? [] : fetched;

  useEffect(() => {
    if (term.length < 2) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/tags/search?q=${encodeURIComponent(term)}${source === "hitomi" ? "&source=hitomi" : ""}`,
          {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as Tag[];
        if (Array.isArray(data)) setFetched(data);
      } catch {
        // Ignore aborted or failed autocomplete.
      }
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [source, term]);

  return (
    <form
      action="/search"
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        setOpen(false);
        router.push(searchHref({ q, source }));
      }}
    >
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        name="q"
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder={
          source === "hitomi"
            ? "Title, artist:name, female:tag…"
            : "Search titles, tags, artist:name…"
        }
        className="h-9 bg-card pl-8"
        autoComplete="off"
        aria-autocomplete="list"
        aria-controls={boxId}
        aria-expanded={open && suggestions.length > 0}
      />
      {open && suggestions.length > 0 ? (
        <ul
          id={boxId}
          className="absolute top-[calc(100%+4px)] z-50 w-full overflow-hidden rounded-lg border border-border bg-popover py-1 text-sm shadow-none"
        >
          {suggestions.map((tag) => (
            <li key={`${tag.type}-${tag.id}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-muted"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  router.push(
                    source === "hitomi"
                      ? searchHref({ q: `${tag.type}:${tag.slug}`, source })
                      : `/tag/${tag.type}/${tag.slug}`,
                  );
                }}
              >
                <span>
                  {tag.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {tag.type}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {tag.count.toLocaleString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
