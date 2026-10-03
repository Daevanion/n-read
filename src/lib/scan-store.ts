import { randomUUID } from "crypto";
import type { Tier } from "@/lib/classify";

export type StoredEntry = {
  id: string;
  relativePath: string;
  absolutePath: string;
  tier: Tier;
  kind: "file" | "dir";
  bytes: number;
};

export type StoredScan = {
  id: string;
  root: string;
  entries: Map<string, StoredEntry>;
  createdAt: number;
};

type ScanGlobal = typeof globalThis & { __spareScans?: Map<string, StoredScan> };

const scans = ((globalThis as ScanGlobal).__spareScans ??= new Map<string, StoredScan>());
const MAX_SCANS = 8;

export function saveScan(root: string, entries: StoredEntry[]): StoredScan {
  const scan: StoredScan = {
    id: randomUUID(),
    root,
    entries: new Map(entries.map((entry) => [entry.id, entry])),
    createdAt: Date.now(),
  };
  scans.set(scan.id, scan);
  while (scans.size > MAX_SCANS) {
    const oldest = scans.keys().next().value;
    if (!oldest) break;
    scans.delete(oldest);
  }
  return scan;
}

export function getScan(scanId: string): StoredScan | undefined {
  return scans.get(scanId);
}
