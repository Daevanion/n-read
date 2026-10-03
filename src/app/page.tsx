import { SpareApp } from "@/components/spare-app";
import { SafeError } from "@/lib/errors";
import { scanDirectory } from "@/lib/scan";
import { ensureSample } from "@/lib/seed-sample";
import { getSuggestions } from "@/lib/suggestions";
import type { ScanResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const suggestions = getSuggestions();
  let initialScan: ScanResult | null = null;
  let initialError: string | null = null;

  try {
    const sample = await ensureSample();
    initialScan = await scanDirectory(sample);
  } catch (error) {
    initialError =
      error instanceof SafeError
        ? error.message
        : "Could not prepare the sample closet.";
  }

  return (
    <SpareApp
      suggestions={suggestions}
      initialScan={initialScan}
      initialError={initialError}
    />
  );
}
