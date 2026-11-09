"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { tagLooksBlocked } from "@/lib/filter";
import { parseSort, searchHref, TAG_TYPES } from "@/lib/query";
import {
  buildSearchQuery,
  cycleTag,
  parseSearchQuery,
  tagKey,
  tagLabel,
  type TagClause,
  type TagMode,
} from "@/lib/tag-query";
import type { Tag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";

const TYPE_LABELS: Record<(typeof TAG_TYPES)[number], string> = {
  tag: "Tags",
  artist: "Artists",
  character: "Characters",
  parody: "Parodies",
  group: "Groups",
  language: "Languages",
  category: "Categories",
};

function modeOf(tags: TagClause[], type: string, value: string): TagMode | "off" {
  return tags.find((clause) => tagKey(clause) === tagKey({ type, value }))?.mode ?? "off";
}

function chipClass(mode: TagMode | "off") {
  return cn(
    "inline-flex h-7 max-w-full items-center rounded-full border px-3 text-xs font-medium transition-colors",
    mode === "include" && "border-primary bg-primary text-primary-foreground",
    mode === "exclude" && "border-destructive bg-destructive/15 text-destructive",
    mode === "off" && "border-border bg-card text-foreground/80 hover:text-foreground",
  );
}

export function TagTogglePanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const sort = parseSort(searchParams.get("sort") ?? undefined);
  const parsed = parseSearchQuery(urlQuery);
  const [text, setText] = useState(parsed.text);
  const [prevText, setPrevText] = useState(parsed.text);
  const [type, setType] = useState<(typeof TAG_TYPES)[number]>("tag");
  const [loaded, setLoaded] = useState<{ type: string; tags: Tag[] } | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [lookup, setLookup] = useState("");
  const [hits, setHits] = useState<Tag[]>([]);
  const [hitsOpen, setHitsOpen] = useState(false);
  const listId = useId();

  if (parsed.text !== prevText) {
    setPrevText(parsed.text);
    setText(parsed.text);
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/tags?type=${type}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load tags.");
        return (await response.json()) as Tag[];
      })
      .then((tags) => {
        if (!controller.signal.aborted && Array.isArray(tags)) {
          setLoaded({ type, tags });
          setListError(null);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setListError(error instanceof Error ? error.message : "Could not load tags.");
      });
    return () => controller.abort();
  }, [type]);

  useEffect(() => {
    const term = lookup.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/tags/search?q=${encodeURIComponent(term)}`, {
        signal: controller.signal,
      })
        .then(async (response) => (response.ok ? ((await response.json()) as Tag[]) : []))
        .then((tags) => {
          if (!controller.signal.aborted && Array.isArray(tags)) setHits(tags);
        })
        .catch(() => {
          // Ignore aborted lookups.
        });
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [lookup]);

  function go(tags: TagClause[], words = text) {
    router.push(searchHref({ q: buildSearchQuery(words, tags), sort }));
  }

  function toggle(tag: { type: string; slug: string; name: string; id: number }) {
    const current = modeOf(parsed.tags, tag.type, tag.slug);
    if (current === "off" && tagLooksBlocked(tag)) return;
    go(cycleTag(parsed.tags, { type: tag.type, value: tag.slug }));
  }

  const visible = loaded?.type === type ? loaded.tags : [];
  const loading = loaded?.type !== type && !listError;
  const suggestions = lookup.trim().length < 2 ? [] : hits;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card/70 p-4 sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl italic">Tags</h2>
          <p className="text-sm text-muted-foreground">
            Click a tag to require it, again to exclude it, and again to clear it.
          </p>
        </div>
        {parsed.tags.length > 0 ? (
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => go([])}
          >
            Clear tags
          </button>
        ) : null}
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setHitsOpen(false);
          go(parsed.tags, text);
        }}
      >
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={lookup}
            onChange={(event) => {
              setLookup(event.target.value);
              setHitsOpen(true);
            }}
            onFocus={() => setHitsOpen(true)}
            onBlur={() => window.setTimeout(() => setHitsOpen(false), 120)}
            placeholder="Find a tag, artist, or character"
            className="h-9 bg-background pl-8"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded={hitsOpen && suggestions.length > 0}
          />
          {hitsOpen && suggestions.length > 0 ? (
            <ul
              id={listId}
              className="absolute top-[calc(100%+4px)] z-50 max-h-64 w-full overflow-auto rounded-lg border border-border bg-popover py-1 text-sm"
            >
              {suggestions.map((tag) => (
                <li key={`${tag.type}-${tag.id}`}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left hover:bg-muted"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      toggle(tag);
                      setLookup("");
                      setHitsOpen(false);
                    }}
                  >
                    <span className="truncate">
                      {tag.name}
                      <span className="ml-2 text-xs text-muted-foreground">{tag.type}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {tag.count.toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Extra words"
          className="h-9 bg-background sm:max-w-56"
          aria-label="Extra words"
        />
      </form>

      {parsed.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {parsed.tags.map((clause) => (
            <button
              key={tagKey(clause)}
              type="button"
              className={chipClass(clause.mode)}
              aria-pressed={clause.mode === "include"}
              onClick={() => toggle({
                id: 0,
                type: clause.type,
                slug: clause.value,
                name: tagLabel(clause.value),
              })}
            >
              <span className="truncate">
                {clause.mode === "exclude" ? "− " : ""}
                {tagLabel(clause.value)}
              </span>
              <span className="ml-1.5 text-[10px] uppercase opacity-70">{clause.type}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {TAG_TYPES.map((option) => (
          <button
            key={option}
            type="button"
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
              option === type
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setType(option)}
          >
            {TYPE_LABELS[option]}
          </button>
        ))}
      </div>

      {listError ? (
        <p className="text-sm text-muted-foreground">{listError}</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading {TYPE_LABELS[type].toLowerCase()}…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tags in this list.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {visible.map((tag) => {
            const mode = modeOf(parsed.tags, tag.type, tag.slug);
            return (
              <button
                key={tag.id}
                type="button"
                className={chipClass(mode)}
                aria-pressed={mode === "include"}
                title={
                  mode === "include"
                    ? "Required. Click to exclude."
                    : mode === "exclude"
                      ? "Excluded. Click to clear."
                      : "Click to require this tag."
                }
                onClick={() => toggle(tag)}
              >
                {mode === "exclude" ? "− " : ""}
                {tag.name}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
