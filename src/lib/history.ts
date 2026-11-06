import type { HistoryEntry } from "@/lib/types";

export const HISTORY_KEY = "eronikki.history";
export const READER_MODE_KEY = "eronikki.reader.mode";
export const HISTORY_EVENT = "eronikki-history";
export const READER_MODE_EVENT = "eronikki-reader-mode";
const MAX_HISTORY = 24;
const EMPTY_HISTORY: HistoryEntry[] = [];

let historyCache: { raw: string | null; value: HistoryEntry[] } = {
  raw: null,
  value: EMPTY_HISTORY,
};

export type ReaderMode = "page" | "strip";

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return EMPTY_HISTORY;
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (raw === historyCache.raw) return historyCache.value;
    if (!raw) {
      historyCache = { raw, value: EMPTY_HISTORY };
      return historyCache.value;
    }
    const parsed = JSON.parse(raw) as HistoryEntry[];
    if (!Array.isArray(parsed)) {
      historyCache = { raw, value: EMPTY_HISTORY };
      return historyCache.value;
    }
    const value = parsed.filter(
      (entry) =>
        entry &&
        Number.isInteger(entry.id) &&
        typeof entry.title === "string" &&
        typeof entry.thumbnail === "string",
    );
    historyCache = { raw, value };
    return value;
  } catch {
    return EMPTY_HISTORY;
  }
}

export function subscribeHistory(onStoreChange: () => void) {
  window.addEventListener(HISTORY_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(HISTORY_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function emptyHistory(): HistoryEntry[] {
  return EMPTY_HISTORY;
}

export function recordProgress(entry: HistoryEntry): HistoryEntry[] {
  const next = [
    entry,
    ...loadHistory().filter((item) => item.id !== entry.id),
  ].slice(0, MAX_HISTORY);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    historyCache = { raw: JSON.stringify(next), value: next };
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {
    // Ignore quota errors; reading still works without history.
  }
  return next;
}

export function loadReaderMode(): ReaderMode {
  if (typeof window === "undefined") return "page";
  return window.localStorage.getItem(READER_MODE_KEY) === "strip"
    ? "strip"
    : "page";
}

export function subscribeReaderMode(onStoreChange: () => void) {
  window.addEventListener(READER_MODE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(READER_MODE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function saveReaderMode(mode: ReaderMode) {
  try {
    window.localStorage.setItem(READER_MODE_KEY, mode);
    window.dispatchEvent(new Event(READER_MODE_EVENT));
  } catch {
    // ignore
  }
}
