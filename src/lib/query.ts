import type { SortOption } from "@/lib/types";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "popular-today", label: "Today" },
  { value: "popular-week", label: "This week" },
  { value: "popular-month", label: "This month" },
];

export const LANGUAGE_FILTERS = [
  { label: "All", query: "" },
  { label: "English", query: "language:english" },
  { label: "Japanese", query: "language:japanese" },
  { label: "Chinese", query: "language:chinese" },
] as const;

const SORT_SET = new Set(SORT_OPTIONS.map((option) => option.value));

export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePage(value: string | string[] | undefined, fallback = 1): number {
  const n = Number(firstParam(value));
  if (!Number.isInteger(n) || n < 1) return fallback;
  return Math.min(n, 1_000_000);
}

export function parseSort(
  value: string | string[] | undefined,
  fallback: SortOption = "date",
): SortOption {
  const raw = firstParam(value);
  if (raw && SORT_SET.has(raw as SortOption)) return raw as SortOption;
  return fallback;
}

export function parseQuery(value: string | string[] | undefined): string {
  return (firstParam(value) ?? "").trim().slice(0, 200);
}

export function parseGalleryId(value: string | undefined): number | null {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1 || id > 99_999_999) return null;
  return id;
}

export function searchHref(input: {
  q?: string;
  sort?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  const q = (input.q ?? "").trim();
  if (q) params.set("q", q);
  if (input.sort && input.sort !== "date") params.set("sort", input.sort);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

export function tagHref(
  type: string,
  slug: string,
  input: { sort?: string; page?: number } = {},
): string {
  const params = new URLSearchParams();
  if (input.sort && input.sort !== "date") params.set("sort", input.sort);
  if (input.page && input.page > 1) params.set("page", String(input.page));
  const qs = params.toString();
  return qs ? `/tag/${type}/${slug}?${qs}` : `/tag/${type}/${slug}`;
}

export const TAG_TYPES = [
  "tag",
  "artist",
  "character",
  "parody",
  "group",
  "language",
  "category",
] as const;

export function isTagType(value: string): boolean {
  return (TAG_TYPES as readonly string[]).includes(value);
}
