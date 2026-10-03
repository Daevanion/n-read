import type { CategoryId, Tier } from "@/lib/classify";

export type ScanEntry = {
  id: string;
  name: string;
  relativePath: string;
  displayPath: string;
  bytes: number;
  mtimeMs: number;
  fileCount: number;
  kind: "file" | "dir";
  category: CategoryId;
  tier: Tier;
  reason: string;
  duplicateOf?: string;
};

export type CategorySummary = {
  id: CategoryId;
  bytes: number;
  count: number;
};

export type ScanResult = {
  scanId: string;
  root: string;
  sample: boolean;
  includesApp: boolean;
  scannedAt: string;
  elapsedMs: number;
  truncated: boolean;
  visited: number;
  skipped: number;
  omitted: number;
  totals: {
    bytes: number;
    count: number;
    optionalBytes: number;
    reviewBytes: number;
    keepBytes: number;
    optionalCount: number;
    reviewCount: number;
    keepCount: number;
  };
  categories: CategorySummary[];
  entries: ScanEntry[];
};

export type Suggestion = {
  id: string;
  label: string;
  path: string;
  detail: string;
};

export type RemoveFailure = {
  id: string;
  path?: string;
  error: string;
};

export type RemoveResult = {
  removed: { id: string; path: string; bytes: number }[];
  failed: RemoveFailure[];
  freedBytes: number;
};
