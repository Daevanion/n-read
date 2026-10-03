import { existsSync } from "fs";
import os from "os";
import path from "path";
import { isBlockedPath } from "@/lib/guard";
import { sampleRoot } from "@/lib/seed-sample";
import type { Suggestion } from "@/lib/types";

export function getSuggestions(): Suggestion[] {
  const home = os.homedir();
  const candidates: Suggestion[] = [
    {
      id: "sample",
      label: "Sample closet",
      path: sampleRoot(),
      detail: "Practice on placeholder files",
    },
    {
      id: "home",
      label: "Home",
      path: home,
      detail: "Your home folder",
    },
    {
      id: "downloads",
      label: "Downloads",
      path: path.join(home, "Downloads"),
      detail: "Installers and old files often land here",
    },
    {
      id: "desktop",
      label: "Desktop",
      path: path.join(home, "Desktop"),
      detail: "Loose files on the desktop",
    },
  ];

  return candidates.filter((suggestion) => {
    if (suggestion.id === "sample") return true;
    if (!existsSync(suggestion.path)) return false;
    return !isBlockedPath(suggestion.path);
  });
}
