import path from "path";

const ALLOW_PREFIXES = ["/tmp", "/var/tmp", "/private/tmp"];

const BLOCK_PREFIXES = [
  "/bin",
  "/sbin",
  "/usr",
  "/lib",
  "/lib64",
  "/boot",
  "/etc",
  "/proc",
  "/sys",
  "/dev",
  "/run",
  "/opt",
  "/root",
  "/snap",
  "/var",
  "/System",
  "/Library",
  "/private",
  "/Windows",
  "/Program Files",
  "/Program Files (x86)",
];

function normalize(candidate: string): string {
  const resolved = path.resolve(candidate);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function isUnder(candidate: string, prefix: string): boolean {
  const left = normalize(candidate);
  const right = normalize(prefix);
  return (
    left === right ||
    left.startsWith(right.endsWith(path.sep) ? right : right + path.sep)
  );
}

export function isBlockedPath(candidate: string): boolean {
  const resolved = path.resolve(candidate);
  if (resolved === path.parse(resolved).root) return true;
  if (ALLOW_PREFIXES.some((prefix) => isUnder(resolved, prefix))) return false;
  return BLOCK_PREFIXES.some((prefix) => isUnder(resolved, prefix));
}

/** True when candidate is strictly inside root (the root itself does not count). */
export function isInsideRoot(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (relative === "") return false;
  return !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}
