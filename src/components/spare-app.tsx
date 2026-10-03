"use client";

import { useMemo, useState } from "react";
import { File, Folder, RotateCcw, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  TIER_META,
  TIER_ORDER,
  type CategoryId,
  type Tier,
} from "@/lib/classify";
import { formatAge, formatBytes, formatCount, formatElapsed, formatPercent } from "@/lib/format";
import type { RemoveResult, ScanEntry, ScanResult, Suggestion } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = { kind: "tier"; tier: Tier } | { kind: "category"; category: CategoryId };
type SortKey = "largest" | "oldest" | "name";

const TONE: Record<
  Tier,
  { active: string; idle: string; bar: string; text: string; soft: string }
> = {
  optional: {
    active: "border-optional bg-optional-soft ring-1 ring-optional/30",
    idle: "border-border bg-card hover:border-optional/40",
    bar: "bg-optional",
    text: "text-optional",
    soft: "bg-optional-soft text-optional",
  },
  review: {
    active: "border-review bg-review-soft ring-1 ring-review/30",
    idle: "border-border bg-card hover:border-review/40",
    bar: "bg-review",
    text: "text-review",
    soft: "bg-review-soft text-review",
  },
  keep: {
    active: "border-keep/40 bg-keep-soft ring-1 ring-keep/20",
    idle: "border-border bg-card hover:border-keep/30",
    bar: "bg-keep/70",
    text: "text-keep",
    soft: "bg-keep-soft text-keep",
  },
};

export function SpareApp({
  suggestions,
  initialScan,
  initialError,
}: {
  suggestions: Suggestion[];
  initialScan: ScanResult | null;
  initialError: string | null;
}) {
  const [path, setPath] = useState(initialScan?.root ?? suggestions[0]?.path ?? "");
  const [scan, setScan] = useState<ScanResult | null>(initialScan);
  const [filter, setFilter] = useState<Filter>(
    initialScan ? defaultFilter(initialScan) : { kind: "tier", tier: "optional" },
  );
  const [sort, setSort] = useState<SortKey>("largest");
  const [query, setQuery] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(120);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const filtered = useMemo(() => {
    if (!scan) return [];
    const needle = query.trim().toLowerCase();
    return scan.entries.filter((entry) => {
      if (filter.kind === "tier" && entry.tier !== filter.tier) return false;
      if (filter.kind === "category" && entry.category !== filter.category) return false;
      if (!needle) return true;
      return (
        entry.name.toLowerCase().includes(needle) ||
        entry.displayPath.toLowerCase().includes(needle) ||
        entry.reason.toLowerCase().includes(needle)
      );
    });
  }, [scan, filter, query]);

  const sorted = useMemo(() => sortEntries(filtered, sort), [filtered, sort]);
  const visible = sorted.slice(0, visibleLimit);
  const groups = groupEntries(visible);
  const selectable = sorted.filter((entry) => entry.tier !== "keep");
  const selectedEntries = scan?.entries.filter((entry) => selected.has(entry.id)) ?? [];
  const selectedBytes = selectedEntries.reduce((sum, entry) => sum + entry.bytes, 0);
  const selectedDirs = selectedEntries.filter((entry) => entry.kind === "dir").length;

  async function runScan(nextPath: string): Promise<boolean> {
    const trimmed = nextPath.trim();
    if (!trimmed) {
      setError("Enter a folder path to scan.");
      return false;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: trimmed }),
      });
      const data = (await response.json()) as ScanResult & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not scan that folder.");
        return false;
      }
      setScan(data);
      setPath(data.root);
      setFilter(defaultFilter(data));
      setSelected(new Set());
      setQuery("");
      setVisibleLimit(120);
      return true;
    } catch {
      setError("Could not reach Spare. Leave this tab open and try the scan again.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function restoreSample() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/sample", { method: "POST" });
      const data = (await response.json()) as { path?: string; error?: string };
      if (!response.ok || !data.path) {
        setError(data.error ?? "Could not restore the sample closet.");
        setLoading(false);
        return;
      }
      const ok = await runScan(data.path);
      if (ok) setNotice("Sample closet restored.");
    } catch {
      setError("Could not restore the sample closet.");
      setLoading(false);
    }
  }

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function selectListed() {
    setSelected((current) => {
      const next = new Set(current);
      for (const entry of selectable) next.add(entry.id);
      return next;
    });
  }

  async function confirmRemove() {
    if (!scan || phrase !== "remove") return;
    setRemoving(true);
    setDialogError(null);
    try {
      const response = await fetch("/api/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId: scan.scanId, ids: [...selected] }),
      });
      const data = (await response.json()) as RemoveResult & { error?: string };
      if (!response.ok) {
        setDialogError(data.error ?? "Could not delete those items.");
        return;
      }
      if (data.removed.length === 0) {
        setDialogError(data.failed[0]?.error ?? "Nothing was deleted.");
        return;
      }
      const removedCount = data.removed.length;
      const removedLabel = removedCount === 1 ? "item" : "items";
      const failed = data.failed.length;
      const message = failed
        ? `Removed ${formatCount(removedCount)} ${removedLabel} (${formatBytes(data.freedBytes)}). ${formatCount(failed)} could not be deleted.`
        : `Removed ${formatCount(removedCount)} ${removedLabel} and freed ${formatBytes(data.freedBytes)}.`;
      setDialogOpen(false);
      setPhrase("");
      const ok = await runScan(scan.root);
      if (ok) setNotice(message);
    } catch {
      setDialogError("Could not reach Spare.");
    } finally {
      setRemoving(false);
    }
  }

  const activeTier = filter.kind === "tier" ? filter.tier : CATEGORY_META[filter.category].tier;
  const tierCategories =
    scan?.categories.filter((category) => CATEGORY_META[category.id].tier === activeTier) ?? [];

  return (
    <div className="spare-canvas min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pt-8 pb-28 sm:px-6 sm:pt-12">
        <header>
          <p className="text-xs font-medium tracking-[0.22em] text-optional uppercase">
            Disk cleanup
          </p>
          <h1 className="font-heading mt-2 text-5xl tracking-tight text-foreground sm:text-6xl">
            <span className="italic">Spare</span>
          </h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Sort a folder into what you can drop, what deserves a look, and what you should keep.
            Optional files are the ones that are usually safe to clear.
          </p>

          <form
            className="mt-8 flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void runScan(path);
            }}
          >
            <label className="sr-only" htmlFor="folder-path">
              Folder to scan
            </label>
            <Input
              id="folder-path"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="/home/you/Downloads"
              spellCheck={false}
              className="h-11 bg-card px-3 font-mono text-sm md:text-sm"
            />
            <Button type="submit" disabled={loading} className="h-11 px-4 sm:w-36">
              {loading ? "Scanning…" : "Scan folder"}
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => {
              const current = scan?.root === suggestion.path;
              return (
                <Button
                  key={suggestion.id}
                  type="button"
                  variant={current ? "secondary" : "outline"}
                  className="h-8 bg-card"
                  disabled={loading}
                  onClick={() => {
                    setPath(suggestion.path);
                    void runScan(suggestion.path);
                  }}
                >
                  {suggestion.label}
                </Button>
              );
            })}
          </div>
        </header>

        {error ? (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {notice ? (
          <p
            role="status"
            className="mt-6 rounded-xl border border-optional/30 bg-optional-soft px-4 py-3 text-sm text-foreground"
          >
            {notice}
          </p>
        ) : null}

        {scan ? (
          <section className={cn("mt-8", loading && "pointer-events-none opacity-60")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-heading text-3xl tracking-tight">{baseName(scan.root)}</h2>
                <p className="mt-1 font-mono text-xs break-all text-muted-foreground">{scan.root}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatBytes(scan.totals.bytes)} across {formatCount(scan.totals.count)} items
                <span className="px-1.5">·</span>
                sorted in {formatElapsed(scan.elapsedMs)}
              </p>
            </div>

            {scan.sample ? (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                  This is a sample closet: placeholder files with realistic names and sizes.
                  Delete freely, then restore it. Scan a real folder when you want your own files.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 shrink-0 bg-card"
                  disabled={loading}
                  onClick={() => void restoreSample()}
                >
                  <RotateCcw />
                  Restore sample
                </Button>
              </div>
            ) : null}

            {scan.includesApp ? (
              <p className="mt-4 rounded-2xl border border-review/30 bg-review-soft px-4 py-3 text-sm leading-relaxed text-foreground">
                This folder contains Spare. Its dependencies and build output show up as optional
                because they can be reinstalled, and removing them stops the app until you run{" "}
                <span className="font-mono">npm install</span>.
              </p>
            ) : null}

            {scan.truncated || scan.omitted > 0 || scan.skipped > 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {scan.truncated
                  ? `Stopped after reading ${formatCount(scan.visited)} items, so this is a partial picture. `
                  : null}
                {scan.omitted > 0
                  ? `${formatCount(scan.omitted)} smaller items are not listed. `
                  : null}
                {scan.skipped > 0
                  ? `${formatCount(scan.skipped)} items were skipped because they were unreadable or links.`
                  : null}
              </p>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {TIER_ORDER.map((tier) => {
                const bytes =
                  tier === "optional"
                    ? scan.totals.optionalBytes
                    : tier === "review"
                      ? scan.totals.reviewBytes
                      : scan.totals.keepBytes;
                const count =
                  tier === "optional"
                    ? scan.totals.optionalCount
                    : tier === "review"
                      ? scan.totals.reviewCount
                      : scan.totals.keepCount;
                const pressed = activeTier === tier && filter.kind === "tier";
                return (
                  <button
                    key={tier}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => {
                      setFilter({ kind: "tier", tier });
                      setVisibleLimit(120);
                    }}
                    className={cn(
                      "rounded-2xl border px-4 py-4 text-left transition-colors",
                      pressed ? TONE[tier].active : TONE[tier].idle,
                    )}
                  >
                    <span className={cn("block text-xs font-medium tracking-[0.16em] uppercase", TONE[tier].text)}>
                      {TIER_META[tier].label}
                    </span>
                    <span className="font-heading mt-2 block text-3xl tracking-tight tabular-nums">
                      {formatBytes(bytes)}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {formatCount(count)} {count === 1 ? "item" : "items"} · {TIER_META[tier].sentence}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <div className="flex h-2 overflow-hidden rounded-full bg-keep-soft">
                {TIER_ORDER.map((tier) => {
                  const bytes =
                    tier === "optional"
                      ? scan.totals.optionalBytes
                      : tier === "review"
                        ? scan.totals.reviewBytes
                        : scan.totals.keepBytes;
                  if (bytes <= 0 || scan.totals.bytes <= 0) return null;
                  return (
                    <div
                      key={tier}
                      className={TONE[tier].bar}
                      style={{ width: `${(bytes / scan.totals.bytes) * 100}%` }}
                    />
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {TIER_ORDER.map((tier, index) => {
                  const bytes =
                    tier === "optional"
                      ? scan.totals.optionalBytes
                      : tier === "review"
                        ? scan.totals.reviewBytes
                        : scan.totals.keepBytes;
                  return (
                    <span key={tier}>
                      {index > 0 ? <span className="px-1.5">·</span> : null}
                      {TIER_META[tier].label} {formatPercent(bytes, scan.totals.bytes)}
                    </span>
                  );
                })}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={filter.kind === "tier" ? "default" : "outline"}
                  className={filter.kind === "tier" ? "h-8" : "h-8 bg-card"}
                  onClick={() => {
                    setFilter({ kind: "tier", tier: activeTier });
                    setVisibleLimit(120);
                  }}
                >
                  All {TIER_META[activeTier].label.toLowerCase()}
                </Button>
                {tierCategories.map((category) => {
                  const active = filter.kind === "category" && filter.category === category.id;
                  return (
                    <Button
                      key={category.id}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className={active ? "h-8" : "h-8 bg-card"}
                      onClick={() => {
                        setFilter({ kind: "category", category: category.id });
                        setVisibleLimit(120);
                      }}
                    >
                      {CATEGORY_META[category.id].label}
                      <span className="tabular-nums opacity-70">{formatBytes(category.bytes)}</span>
                    </Button>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setVisibleLimit(120);
                  }}
                  placeholder="Filter by name or path"
                  aria-label="Filter the list"
                  className="h-9 bg-card sm:w-56"
                />
                <label className="sr-only" htmlFor="sort-files">
                  Sort files
                </label>
                <select
                  id="sort-files"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                  className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm"
                >
                  <option value="largest">Largest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>

            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {filter.kind === "category"
                ? CATEGORY_META[filter.category].blurb
                : TIER_META[activeTier].hint}
            </p>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {formatCount(sorted.length)} shown
              </p>
              {selectable.length > 0 ? (
                <Button type="button" variant="ghost" className="h-8" onClick={selectListed}>
                  Select all {formatCount(selectable.length)}
                </Button>
              ) : null}
            </div>

            {visible.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
                <p className="font-heading text-2xl">Nothing in this view</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {query
                    ? "Try a different name, or clear the filter."
                    : "This part of the folder is empty. Try another category."}
                </p>
              </div>
            ) : (
              <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
                {groups.map((group) => (
                  <div key={group.id}>
                    {filter.kind === "tier" ? (
                      <div className="flex items-baseline justify-between gap-3 border-b border-border bg-muted/60 px-4 py-2">
                        <p className="text-sm font-medium">{CATEGORY_META[group.id].label}</p>
                        <p className="hidden min-w-0 truncate text-xs text-muted-foreground md:block">
                          {CATEGORY_META[group.id].blurb}
                        </p>
                      </div>
                    ) : null}
                    <ul>
                      {group.entries.map((entry) => (
                        <li key={entry.id} className="border-b border-border last:border-b-0">
                          <EntryRow
                            entry={entry}
                            checked={selected.has(entry.id)}
                            onCheckedChange={(checked) => toggle(entry.id, checked)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {sorted.length > visible.length ? (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-card"
                  onClick={() => setVisibleLimit((current) => current + 120)}
                >
                  Show {formatCount(Math.min(120, sorted.length - visible.length))} more
                </Button>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="mt-10 grid gap-3 sm:grid-cols-3">
            {TIER_ORDER.map((tier) => (
              <article key={tier} className="rounded-2xl border border-border bg-card px-4 py-4">
                <p className={cn("text-xs font-medium tracking-[0.16em] uppercase", TONE[tier].text)}>
                  {TIER_META[tier].label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{TIER_META[tier].hint}</p>
              </article>
            ))}
          </section>
        )}

        <section className="mt-12">
          <Separator />
          <h2 className="font-heading mt-8 text-2xl">How a file gets its label</h2>
          <div className="mt-4 grid gap-6 text-sm leading-relaxed text-muted-foreground md:grid-cols-3">
            <p>
              <span className="font-medium text-foreground">Optional</span> covers caches,{" "}
              <span className="font-mono">node_modules</span> and virtual environments, build folders
              that sit next to a project, logs, junk files like <span className="font-mono">.DS_Store</span>,
              and extra copies of a file. One copy of each duplicate is kept.
            </p>
            <p>
              <span className="font-medium text-foreground">Review</span> covers installers, archives,
              videos over 50 MB, audio over 30 MB, images over 25 MB, and anything left in Downloads
              for 90 days. Spare will not guess whether you still want them.
            </p>
            <p>
              <span className="font-medium text-foreground">Keep</span> is everything else, including
              documents, source, and version history. Unrecognized files stay here. Spare will not
              delete them, and nothing at all is deleted until you select it and type remove.
            </p>
          </div>
        </section>
      </div>

      {selectedEntries.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm">
              <span className="font-medium">{formatCount(selectedEntries.length)} selected</span>
              <span className="text-muted-foreground"> · {formatBytes(selectedBytes)}</span>
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setPhrase("");
                  setDialogError(null);
                  setDialogOpen(true);
                }}
              >
                Review removal
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (removing) return;
          setDialogOpen(open);
          if (!open) {
            setPhrase("");
            setDialogError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Remove {formatCount(selectedEntries.length)}{" "}
              {selectedEntries.length === 1 ? "item" : "items"} ({formatBytes(selectedBytes)})?
            </DialogTitle>
            <DialogDescription>
              This permanently deletes them from the scanned folder. Caches and dependencies can be
              recreated. Logs and extra copies cannot.
              {selectedDirs > 0
                ? ` ${formatCount(selectedDirs)} ${selectedDirs === 1 ? "folder is" : "folders are"} included, and everything inside goes too.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-40 space-y-1 overflow-auto font-mono text-xs text-muted-foreground">
            {selectedEntries
              .slice()
              .sort((a, b) => b.bytes - a.bytes)
              .slice(0, 6)
              .map((entry) => (
                <li key={entry.id} className="truncate">
                  {entry.displayPath}
                </li>
              ))}
            {selectedEntries.length > 6 ? (
              <li>and {formatCount(selectedEntries.length - 6)} more</li>
            ) : null}
          </ul>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void confirmRemove();
            }}
          >
            <label htmlFor="confirm-remove" className="text-sm">
              Type <span className="font-mono">remove</span> to confirm
            </label>
            <Input
              id="confirm-remove"
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="mt-2 h-10 bg-card font-mono"
            />
            {dialogError ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {dialogError}
              </p>
            ) : null}
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                disabled={removing}
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={phrase !== "remove" || removing}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {removing ? "Deleting…" : "Delete permanently"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntryRow({
  entry,
  checked,
  onCheckedChange,
}: {
  entry: ScanEntry;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const selectable = entry.tier !== "keep";
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3",
        selectable ? "cursor-pointer hover:bg-muted/50" : "cursor-default",
      )}
      onClick={() => {
        if (selectable) onCheckedChange(!checked);
      }}
    >
      {selectable ? (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={`Select ${entry.name}`}
          className="mt-1"
        />
      ) : (
        <Shield className="mt-0.5 size-4 shrink-0 text-keep" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            {entry.kind === "dir" ? (
              <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <File className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <span className="truncate font-medium">{entry.name}</span>
            <Badge variant="outline" className={cn("hidden sm:inline-flex", TONE[entry.tier].soft)}>
              {entry.tier === "keep" ? "Keep" : TIER_META[entry.tier].label}
            </Badge>
          </span>
          <span className="shrink-0 text-sm tabular-nums">{formatBytes(entry.bytes)}</span>
        </span>
        <span className="mt-1 block text-sm text-muted-foreground">{entry.reason}</span>
        <span className="mt-1 block truncate font-mono text-xs text-muted-foreground" title={entry.displayPath}>
          {entry.displayPath}
          <span className="px-1.5 font-sans">·</span>
          {formatAge(entry.mtimeMs)}
          {entry.kind === "dir" ? (
            <span>
              <span className="px-1.5 font-sans">·</span>
              {formatCount(entry.fileCount)} {entry.fileCount === 1 ? "file" : "files"}
            </span>
          ) : null}
        </span>
      </span>
    </div>
  );
}

function defaultFilter(scan: ScanResult): Filter {
  if (scan.totals.optionalBytes > 0) return { kind: "tier", tier: "optional" };
  if (scan.totals.reviewBytes > 0) return { kind: "tier", tier: "review" };
  return { kind: "tier", tier: "keep" };
}

function sortEntries(entries: ScanEntry[], sort: SortKey): ScanEntry[] {
  return [...entries].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name) || a.displayPath.localeCompare(b.displayPath);
    if (sort === "oldest") return a.mtimeMs - b.mtimeMs || b.bytes - a.bytes;
    return b.bytes - a.bytes || a.name.localeCompare(b.name);
  });
}

function groupEntries(entries: ScanEntry[]): { id: CategoryId; entries: ScanEntry[] }[] {
  const groups = new Map<CategoryId, ScanEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.category) ?? [];
    list.push(entry);
    groups.set(entry.category, list);
  }
  return CATEGORY_ORDER.flatMap((id) => {
    const list = groups.get(id);
    return list ? [{ id, entries: list }] : [];
  });
}

function baseName(root: string): string {
  const parts = root.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] ?? root;
}
