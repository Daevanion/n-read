export type Tier = "optional" | "review" | "keep";

export type CategoryId =
  | "caches"
  | "dependencies"
  | "build"
  | "logs"
  | "duplicates"
  | "installers"
  | "archives"
  | "media"
  | "downloads"
  | "keep";

export type Decision = {
  category: CategoryId;
  tier: Tier;
  reason: string;
};

export const CATEGORY_ORDER: CategoryId[] = [
  "caches",
  "dependencies",
  "build",
  "logs",
  "duplicates",
  "installers",
  "archives",
  "media",
  "downloads",
  "keep",
];

export const TIER_ORDER: Tier[] = ["optional", "review", "keep"];

export const TIER_META: Record<
  Tier,
  { label: string; sentence: string; hint: string }
> = {
  optional: {
    label: "Optional",
    sentence: "Usually safe to remove.",
    hint: "Caches, reinstallable dependencies, build output, logs, and extra copies.",
  },
  review: {
    label: "Review",
    sentence: "Large or old. You decide.",
    hint: "Installers, archives, large media, and downloads untouched for months.",
  },
  keep: {
    label: "Keep",
    sentence: "Left alone on purpose.",
    hint: "Documents, source, version history, and anything Spare does not recognize.",
  },
};

export const CATEGORY_META: Record<
  CategoryId,
  { label: string; tier: Tier; blurb: string }
> = {
  caches: {
    label: "Caches",
    tier: "optional",
    blurb: "App and tool caches. Programs recreate them when they need them.",
  },
  dependencies: {
    label: "Dependencies",
    tier: "optional",
    blurb: "Installed packages. You can reinstall them from the lockfile.",
  },
  build: {
    label: "Build output",
    tier: "optional",
    blurb: "Compiled files sitting next to a project. Rebuild them from source.",
  },
  logs: {
    label: "Logs and junk",
    tier: "optional",
    blurb: "Logs, temporary files, backups, and operating-system clutter.",
  },
  duplicates: {
    label: "Extra copies",
    tier: "optional",
    blurb: "Identical files. One copy stays; these are the extras.",
  },
  installers: {
    label: "Installers",
    tier: "review",
    blurb: "Downloaded installers and portable programs. Drop them if the app is already installed.",
  },
  archives: {
    label: "Archives",
    tier: "review",
    blurb: "Zip files and disk images, often left behind after extracting.",
  },
  media: {
    label: "Large media",
    tier: "review",
    blurb: "Big videos, audio, or images. Open them before you clear them.",
  },
  downloads: {
    label: "Old downloads",
    tier: "review",
    blurb: "Files that have been sitting in Downloads for 90 days or more.",
  },
  keep: {
    label: "Keep",
    tier: "keep",
    blurb: "Spare does not suggest deleting these.",
  },
};

export const LARGE_VIDEO_BYTES = 50 * 1024 * 1024;
export const LARGE_AUDIO_BYTES = 30 * 1024 * 1024;
export const LARGE_IMAGE_BYTES = 25 * 1024 * 1024;
export const OLD_DOWNLOAD_MS = 90 * 24 * 60 * 60 * 1000;
export const DUPLICATE_HASH_LIMIT_BYTES = 32 * 1024 * 1024;

const ALWAYS_CACHE = new Set([
  ".cache",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  ".parcel-cache",
  ".turbo",
  ".npm",
  ".yarn-cache",
  "pip-cache",
  ".gradle",
  "GPUCache",
  "Code Cache",
  "CacheStorage",
  "ShaderCache",
  "GrShaderCache",
  "DawnCache",
]);

const PROJECT_BUILD_DIRS = new Set(["dist", "build", "out", "coverage"]);

const PROJECT_MARKERS = new Set([
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "Pipfile",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "composer.json",
  "Gemfile",
  "mix.exs",
  "Podfile",
  "CMakeLists.txt",
]);

const NATIVE_TARGET_MARKERS = new Set([
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
]);

const CRUFT_NAMES = new Set([
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
  ".localized",
  "ehthumbs.db",
]);

const INSTALLER_EXT = new Set([
  ".dmg",
  ".exe",
  ".msi",
  ".msix",
  ".pkg",
  ".deb",
  ".rpm",
  ".appimage",
  ".apk",
]);

const ARCHIVE_EXT = new Set([
  ".zip",
  ".tar",
  ".gz",
  ".tgz",
  ".bz2",
  ".7z",
  ".rar",
  ".iso",
  ".xz",
  ".tar.gz",
  ".tar.bz2",
  ".tar.xz",
]);

const VIDEO_EXT = new Set([
  ".mp4",
  ".mov",
  ".mkv",
  ".avi",
  ".webm",
  ".m4v",
  ".wmv",
  ".flv",
  ".mpg",
  ".mpeg",
]);

const AUDIO_EXT = new Set([
  ".mp3",
  ".wav",
  ".flac",
  ".aac",
  ".m4a",
  ".ogg",
  ".wma",
  ".aiff",
]);

const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".heif",
  ".tif",
  ".tiff",
  ".bmp",
  ".raw",
  ".cr2",
  ".nef",
  ".arw",
  ".dng",
]);

export type DirContext = {
  name: string;
  parentName: string | null;
  ancestorNames: string[];
  parentHasProjectMarker: boolean;
  parentHasNativeTargetMarker: boolean;
};

export type FileContext = {
  name: string;
  relativePath: string;
  rootBaseName: string;
  bytes: number;
  mtimeMs: number;
  now?: number;
};

export type DuplicateCandidate = {
  id: string;
  relativePath: string;
  mtimeMs: number;
  hash: string;
};

export function projectMarkers(names: string[]): {
  project: boolean;
  nativeTarget: boolean;
} {
  let project = false;
  let nativeTarget = false;
  for (const name of names) {
    if (PROJECT_MARKERS.has(name)) project = true;
    if (NATIVE_TARGET_MARKERS.has(name)) nativeTarget = true;
  }
  return { project, nativeTarget };
}

export function classifyDirectory(ctx: DirContext): Decision | null {
  const name = ctx.name;
  const lower = name.toLowerCase();

  if (name === ".git" || name === ".hg" || name === ".svn") {
    return {
      category: "keep",
      tier: "keep",
      reason: "Version control history. Spare will not treat this as optional.",
    };
  }

  if (name === "node_modules") {
    return {
      category: "dependencies",
      tier: "optional",
      reason: "Installed JavaScript packages. Reinstall them with npm, pnpm, or yarn.",
    };
  }
  if (name === "bower_components") {
    return {
      category: "dependencies",
      tier: "optional",
      reason: "Bower packages. Reinstall with bower install if you still use them.",
    };
  }
  if (name === ".venv" || name === "venv") {
    return {
      category: "dependencies",
      tier: "optional",
      reason: "Python virtual environment. Recreate it from requirements or pyproject.toml.",
    };
  }
  if (name === "site-packages") {
    return {
      category: "dependencies",
      tier: "optional",
      reason: "Installed Python packages. They come back when you recreate the environment.",
    };
  }
  if (name === ".pnpm-store") {
    return {
      category: "dependencies",
      tier: "optional",
      reason: "pnpm's package store. Projects reinstall into it on demand.",
    };
  }

  if (isCacheDirectory(name, ctx.parentName, ctx.ancestorNames)) {
    return {
      category: "caches",
      tier: "optional",
      reason: cacheReason(name),
    };
  }

  if (isSystemTemp(lower, ctx.parentName, ctx.ancestorNames)) {
    return {
      category: "logs",
      tier: "optional",
      reason: "System temporary folder. The operating system recreates what it needs.",
    };
  }

  if (name === ".next") {
    return {
      category: "build",
      tier: "optional",
      reason: "Next.js build output. The next dev or build command recreates it.",
    };
  }

  if (PROJECT_BUILD_DIRS.has(name) && ctx.parentHasProjectMarker) {
    return {
      category: "build",
      tier: "optional",
      reason: buildReason(name),
    };
  }

  if (name === "target" && ctx.parentHasNativeTargetMarker) {
    return {
      category: "build",
      tier: "optional",
      reason: "Compiled Rust or Java output. Cargo or Maven can rebuild it.",
    };
  }

  if (lower === "logs") {
    return {
      category: "logs",
      tier: "optional",
      reason: "Log folder. Remove it if you do not need those logs for debugging.",
    };
  }

  return null;
}

export function classifyFile(ctx: FileContext): Decision {
  const lowerName = ctx.name.toLowerCase();
  const extension = fileExtension(ctx.name);

  if (CRUFT_NAMES.has(lowerName)) {
    return {
      category: "logs",
      tier: "optional",
      reason: "Operating-system junk file. Safe to remove.",
    };
  }

  if (
    lowerName.endsWith(".log") ||
    lowerName.includes(".log.") ||
    extension === ".tmp" ||
    extension === ".temp" ||
    extension === ".bak" ||
    extension === ".swp" ||
    ctx.name.endsWith("~")
  ) {
    return {
      category: "logs",
      tier: "optional",
      reason: lowerName.endsWith(".log") || lowerName.includes(".log.")
        ? "Log file. Safe to remove if you do not need it for debugging."
        : "Temporary or backup file.",
    };
  }

  if (INSTALLER_EXT.has(extension)) {
    return {
      category: "installers",
      tier: "review",
      reason: "Installer or portable program. Remove it if you already installed the app or no longer run it.",
    };
  }

  if (ARCHIVE_EXT.has(extension)) {
    return {
      category: "archives",
      tier: "review",
      reason: "Compressed archive. Often left behind after the folder inside was extracted.",
    };
  }

  if (VIDEO_EXT.has(extension) && ctx.bytes >= LARGE_VIDEO_BYTES) {
    return {
      category: "media",
      tier: "review",
      reason: "Large video. Worth opening before you delete it.",
    };
  }

  if (AUDIO_EXT.has(extension) && ctx.bytes >= LARGE_AUDIO_BYTES) {
    return {
      category: "media",
      tier: "review",
      reason: "Large audio file. Worth a listen before you delete it.",
    };
  }

  if (IMAGE_EXT.has(extension) && ctx.bytes >= LARGE_IMAGE_BYTES) {
    return {
      category: "media",
      tier: "review",
      reason: "Very large image. Worth opening before you delete it.",
    };
  }

  if (isInDownloads(ctx.relativePath, ctx.rootBaseName)) {
    const now = ctx.now ?? Date.now();
    if (now - ctx.mtimeMs >= OLD_DOWNLOAD_MS) {
      return {
        category: "downloads",
        tier: "review",
        reason: "In Downloads and untouched for 90 days or more.",
      };
    }
  }

  return {
    category: "keep",
    tier: "keep",
    reason: "Not a cache, leftover, or extra copy. Spare leaves it alone.",
  };
}

export function fileExtension(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".tar.gz")) return ".tar.gz";
  if (lower.endsWith(".tar.bz2")) return ".tar.bz2";
  if (lower.endsWith(".tar.xz")) return ".tar.xz";
  const index = lower.lastIndexOf(".");
  if (index <= 0) return "";
  return lower.slice(index);
}

export function isInDownloads(relativePath: string, rootBaseName: string): boolean {
  if (rootBaseName.toLowerCase() === "downloads") return true;
  return relativePath
    .split(/[/\\]/)
    .some((part) => part.toLowerCase() === "downloads");
}

export function pickDuplicateExtras(
  files: DuplicateCandidate[],
): Map<string, string> {
  const groups = new Map<string, DuplicateCandidate[]>();
  for (const file of files) {
    const list = groups.get(file.hash) ?? [];
    list.push(file);
    groups.set(file.hash, list);
  }

  const extras = new Map<string, string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => {
      if (a.mtimeMs !== b.mtimeMs) return a.mtimeMs - b.mtimeMs;
      if (a.relativePath < b.relativePath) return -1;
      if (a.relativePath > b.relativePath) return 1;
      return 0;
    });
    const keeper = sorted[0];
    if (!keeper) continue;
    for (const extra of sorted.slice(1)) {
      extras.set(extra.id, keeper.relativePath);
    }
  }
  return extras;
}

function isCacheDirectory(
  name: string,
  parentName: string | null,
  ancestorNames: string[],
): boolean {
  if (ALWAYS_CACHE.has(name)) return true;
  const lower = name.toLowerCase();
  if (lower !== "cache" && lower !== "caches") return false;
  const parent = parentName?.toLowerCase() ?? "";
  const ancestors = ancestorNames.map((ancestor) => ancestor.toLowerCase());
  if (parent === "library" || parent === "appdata" || parent.startsWith(".")) {
    return true;
  }
  return ancestors.includes("library") || ancestors.includes("appdata");
}

function isSystemTemp(
  lowerName: string,
  parentName: string | null,
  ancestorNames: string[],
): boolean {
  if (lowerName !== "temp" && lowerName !== "tmp") return false;
  const parent = parentName?.toLowerCase() ?? "";
  const ancestors = ancestorNames.map((ancestor) => ancestor.toLowerCase());
  if (parent === "windows") return true;
  return ancestors.includes("appdata") || parent === "appdata";
}

function cacheReason(name: string): string {
  if (name === ".turbo") return "Turborepo cache. The next build recreates it.";
  if (name === "__pycache__") return "Python bytecode cache. Python recreates it on import.";
  if (name === ".npm") return "npm download cache. npm refills it when you install.";
  if (name === ".gradle") return "Gradle cache. The next build downloads what it needs.";
  return "Application cache. The app rebuilds it if it still needs it.";
}

function buildReason(name: string): string {
  if (name === "coverage") {
    return "Test coverage output. The next test run regenerates it.";
  }
  return "Build output next to a project file. Rebuild it from source.";
}
