import { createHash, randomUUID } from "crypto";
import { createReadStream } from "fs";
import { lstat, readdir, realpath, stat } from "fs/promises";
import path from "path";
import {
  CATEGORY_ORDER,
  DUPLICATE_HASH_LIMIT_BYTES,
  type CategoryId,
  type Decision,
  type Tier,
  classifyDirectory,
  classifyFile,
  pickDuplicateExtras,
  projectMarkers,
} from "@/lib/classify";
import { SafeError } from "@/lib/errors";
import { isBlockedPath } from "@/lib/guard";
import { saveScan, type StoredEntry } from "@/lib/scan-store";
import { sampleRoot } from "@/lib/seed-sample";
import type { CategorySummary, ScanEntry, ScanResult } from "@/lib/types";

const MAX_VISITS = 80_000;
const MAX_DEPTH = 30;
const MAX_LISTED = 4_000;
const MAX_HASH_FILES = 800;

type MutableEntry = ScanEntry & { absolutePath: string };

export async function scanDirectory(inputPath: string): Promise<ScanResult> {
  const started = Date.now();
  const trimmed = inputPath.trim();
  if (!trimmed || trimmed.includes("\0")) {
    throw new SafeError("Enter a folder path to scan.");
  }

  const resolvedInput = path.resolve(trimmed);
  let root: string;
  try {
    const info = await stat(resolvedInput);
    if (!info.isDirectory()) {
      throw new SafeError("That path is a file. Choose a folder.");
    }
    root = await realpath(resolvedInput);
  } catch (error) {
    if (error instanceof SafeError) throw error;
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new SafeError("That folder does not exist.");
    if (code === "EACCES" || code === "EPERM") {
      throw new SafeError("Spare cannot read that folder.");
    }
    throw new SafeError("Spare could not open that folder.");
  }

  if (isBlockedPath(root)) {
    throw new SafeError(
      "Spare will not scan system folders. Point it at your home folder, Downloads, Desktop, or a project.",
    );
  }

  const budget = { visited: 0, truncated: false, skipped: 0 };
  const entries: MutableEntry[] = [];
  await walk(root, root, [], path.basename(root), 0, budget, entries);

  await markDuplicates(entries);

  const summarized = summarize(entries);
  const ranked = [...entries].sort(compareEntries);
  const listed = ranked.slice(0, MAX_LISTED);
  const scan = saveScan(
    root,
    listed.map((entry) => toStored(entry)),
  );

  const cwd = await realpath(process.cwd()).catch(() => path.resolve(process.cwd()));
  const sample = root === (await realpath(sampleRoot()).catch(() => path.resolve(sampleRoot())));

  return {
    scanId: scan.id,
    root,
    sample,
    includesApp: root === cwd || cwd.startsWith(root + path.sep),
    scannedAt: new Date(started).toISOString(),
    elapsedMs: Date.now() - started,
    truncated: budget.truncated,
    visited: budget.visited,
    skipped: budget.skipped,
    omitted: ranked.length - listed.length,
    totals: summarized.totals,
    categories: summarized.categories,
    entries: listed.map(toPublic),
  };
}

async function walk(
  root: string,
  dir: string,
  ancestorNames: string[],
  parentName: string | null,
  depth: number,
  budget: { visited: number; truncated: boolean; skipped: number },
  entries: MutableEntry[],
): Promise<void> {
  if (depth > MAX_DEPTH) {
    budget.truncated = true;
    return;
  }

  let dirents;
  try {
    dirents = await readdir(dir, { withFileTypes: true });
  } catch {
    budget.skipped += 1;
    return;
  }

  const markers = projectMarkers(dirents.map((dirent) => dirent.name));
  const rootBaseName = path.basename(root);

  for (const dirent of dirents) {
    if (dirent.name === ".spare-sample") continue;
    if (budget.visited >= MAX_VISITS) {
      budget.truncated = true;
      return;
    }
    budget.visited += 1;

    const full = path.join(dir, dirent.name);
    let info;
    try {
      info = await lstat(full);
    } catch {
      budget.skipped += 1;
      continue;
    }
    if (info.isSymbolicLink()) {
      budget.skipped += 1;
      continue;
    }

    if (info.isDirectory()) {
      const decision = classifyDirectory({
        name: dirent.name,
        parentName,
        ancestorNames,
        parentHasProjectMarker: markers.project,
        parentHasNativeTargetMarker: markers.nativeTarget,
      });
      if (decision) {
        const measured = await measure(full, budget);
        if (measured.bytes > 0) {
          entries.push(
            makeEntry(
              root,
              full,
              dirent.name,
              info.mtimeMs,
              measured.bytes,
              measured.files,
              "dir",
              decision,
            ),
          );
        }
        if (measured.truncated) budget.truncated = true;
        continue;
      }
      await walk(
        root,
        full,
        [...ancestorNames, dirent.name],
        dirent.name,
        depth + 1,
        budget,
        entries,
      );
      continue;
    }

    if (!info.isFile() || info.size <= 0) continue;

    const relativePath = path.relative(root, full);
    const decision = classifyFile({
      name: dirent.name,
      relativePath,
      rootBaseName,
      bytes: info.size,
      mtimeMs: info.mtimeMs,
    });
    entries.push(
      makeEntry(root, full, dirent.name, info.mtimeMs, info.size, 1, "file", decision),
    );
  }
}

async function measure(
  dir: string,
  budget: { visited: number; truncated: boolean; skipped: number },
): Promise<{ bytes: number; files: number; truncated: boolean }> {
  let bytes = 0;
  let files = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    let dirents;
    try {
      dirents = await readdir(current, { withFileTypes: true });
    } catch {
      budget.skipped += 1;
      continue;
    }
    for (const dirent of dirents) {
      if (budget.visited >= MAX_VISITS) {
        budget.truncated = true;
        return { bytes, files, truncated: true };
      }
      budget.visited += 1;
      const full = path.join(current, dirent.name);
      let info;
      try {
        info = await lstat(full);
      } catch {
        budget.skipped += 1;
        continue;
      }
      if (info.isSymbolicLink()) continue;
      if (info.isDirectory()) {
        stack.push(full);
      } else if (info.isFile()) {
        bytes += info.size;
        files += 1;
      }
    }
  }
  return { bytes, files, truncated: false };
}

async function markDuplicates(entries: MutableEntry[]): Promise<void> {
  const files = entries.filter(
    (entry) =>
      entry.kind === "file" &&
      entry.bytes > 0 &&
      entry.bytes <= DUPLICATE_HASH_LIMIT_BYTES,
  );
  const bySize = new Map<number, MutableEntry[]>();
  for (const file of files) {
    const list = bySize.get(file.bytes) ?? [];
    list.push(file);
    bySize.set(file.bytes, list);
  }

  const groups = [...bySize.values()]
    .filter((group) => group.length > 1)
    .sort((a, b) => b[0]!.bytes * b.length - a[0]!.bytes * a.length);

  const hashed: { id: string; relativePath: string; mtimeMs: number; hash: string }[] = [];
  let hashedCount = 0;
  for (const group of groups) {
    if (hashedCount >= MAX_HASH_FILES) break;
    const room = MAX_HASH_FILES - hashedCount;
    const slice = group.slice(0, room);
    const results = await Promise.all(
      slice.map(async (entry) => {
        try {
          const hash = await hashFile(entry.absolutePath);
          return { entry, hash };
        } catch {
          return null;
        }
      }),
    );
    for (const result of results) {
      hashedCount += 1;
      if (!result) continue;
      hashed.push({
        id: result.entry.id,
        relativePath: result.entry.relativePath,
        mtimeMs: result.entry.mtimeMs,
        hash: result.hash,
      });
    }
  }

  const extras = pickDuplicateExtras(hashed);
  for (const entry of entries) {
    const keeper = extras.get(entry.id);
    if (!keeper) continue;
    entry.category = "duplicates";
    entry.tier = "optional";
    entry.reason = `Same contents as ${keeper}. That copy stays.`;
    entry.duplicateOf = keeper;
  }
}

function hashFile(file: string): Promise<string> {
  const hash = createHash("sha256");
  return new Promise((resolve, reject) => {
    const stream = createReadStream(file);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function summarize(entries: MutableEntry[]): {
  totals: ScanResult["totals"];
  categories: CategorySummary[];
} {
  const totals = {
    bytes: 0,
    count: entries.length,
    optionalBytes: 0,
    reviewBytes: 0,
    keepBytes: 0,
    optionalCount: 0,
    reviewCount: 0,
    keepCount: 0,
  };
  const categories = new Map<CategoryId, CategorySummary>();

  for (const entry of entries) {
    totals.bytes += entry.bytes;
    if (entry.tier === "optional") {
      totals.optionalBytes += entry.bytes;
      totals.optionalCount += 1;
    } else if (entry.tier === "review") {
      totals.reviewBytes += entry.bytes;
      totals.reviewCount += 1;
    } else {
      totals.keepBytes += entry.bytes;
      totals.keepCount += 1;
    }
    const summary = categories.get(entry.category) ?? {
      id: entry.category,
      bytes: 0,
      count: 0,
    };
    summary.bytes += entry.bytes;
    summary.count += 1;
    categories.set(entry.category, summary);
  }

  return {
    totals,
    categories: CATEGORY_ORDER.flatMap((id) => {
      const summary = categories.get(id);
      return summary ? [summary] : [];
    }),
  };
}

function compareEntries(a: MutableEntry, b: MutableEntry): number {
  const tierDelta = tierRank(a.tier) - tierRank(b.tier);
  if (tierDelta !== 0) return tierDelta;
  if (b.bytes !== a.bytes) return b.bytes - a.bytes;
  return a.displayPath < b.displayPath ? -1 : 1;
}

function tierRank(tier: Tier): number {
  if (tier === "optional") return 0;
  if (tier === "review") return 1;
  return 2;
}

function makeEntry(
  root: string,
  full: string,
  name: string,
  mtimeMs: number,
  bytes: number,
  fileCount: number,
  kind: "file" | "dir",
  decision: Decision,
): MutableEntry {
  const relativePath = path.relative(root, full);
  return {
    id: randomUUID(),
    name,
    relativePath,
    displayPath: full,
    absolutePath: full,
    bytes,
    mtimeMs,
    fileCount,
    kind,
    category: decision.category,
    tier: decision.tier,
    reason: decision.reason,
  };
}

function toStored(entry: MutableEntry): StoredEntry {
  return {
    id: entry.id,
    relativePath: entry.relativePath,
    absolutePath: entry.absolutePath,
    tier: entry.tier,
    kind: entry.kind,
    bytes: entry.bytes,
  };
}

function toPublic(entry: MutableEntry): ScanEntry {
  return {
    id: entry.id,
    name: entry.name,
    relativePath: entry.relativePath,
    displayPath: entry.displayPath,
    bytes: entry.bytes,
    mtimeMs: entry.mtimeMs,
    fileCount: entry.fileCount,
    kind: entry.kind,
    category: entry.category,
    tier: entry.tier,
    reason: entry.reason,
    duplicateOf: entry.duplicateOf,
  };
}
