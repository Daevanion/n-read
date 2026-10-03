import { rm, realpath } from "fs/promises";
import path from "path";
import { SafeError } from "@/lib/errors";
import { isInsideRoot } from "@/lib/guard";
import { getScan } from "@/lib/scan-store";
import type { RemoveResult } from "@/lib/types";

const MAX_IDS = 2_000;

export async function removeEntries(scanId: string, ids: string[]): Promise<RemoveResult> {
  if (!scanId) throw new SafeError("Scan the folder again before deleting.");
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new SafeError("Select at least one item to remove.");
  }
  if (ids.length > MAX_IDS) {
    throw new SafeError(`Select fewer than ${MAX_IDS.toLocaleString("en-US")} items at a time.`);
  }

  const scan = getScan(scanId);
  if (!scan) {
    throw new SafeError("This scan expired. Scan the folder again.", 409);
  }

  const removed: RemoveResult["removed"] = [];
  const failed: RemoveResult["failed"] = [];
  let freedBytes = 0;

  for (const id of new Set(ids)) {
    const entry = scan.entries.get(id);
    if (!entry) {
      failed.push({ id, error: "That item is not part of this scan." });
      continue;
    }
    if (entry.tier === "keep") {
      failed.push({
        id,
        path: entry.relativePath,
        error: "Spare will not delete files it classified as keep.",
      });
      continue;
    }

    const candidate = path.resolve(scan.root, entry.relativePath);
    if (!isInsideRoot(scan.root, candidate)) {
      failed.push({
        id,
        path: entry.relativePath,
        error: "That path is outside the scanned folder.",
      });
      continue;
    }

    let real: string;
    try {
      real = await realpath(candidate);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      failed.push({
        id,
        path: entry.relativePath,
        error: code === "ENOENT" ? "Already gone." : "Could not open that item.",
      });
      continue;
    }

    if (!isInsideRoot(scan.root, real)) {
      failed.push({
        id,
        path: entry.relativePath,
        error: "That path is outside the scanned folder.",
      });
      continue;
    }

    try {
      await rm(real, { recursive: entry.kind === "dir", force: false });
      freedBytes += entry.bytes;
      removed.push({ id, path: entry.relativePath, bytes: entry.bytes });
      scan.entries.delete(id);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      failed.push({
        id,
        path: entry.relativePath,
        error:
          code === "ENOENT"
            ? "Already gone."
            : code === "EACCES" || code === "EPERM"
              ? "Permission denied."
              : "Could not delete that item.",
      });
    }
  }

  return { removed, failed, freedBytes };
}
