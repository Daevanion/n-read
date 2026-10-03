import path from "path";
import { SafeError } from "@/lib/errors";
import { scanDirectory } from "@/lib/scan";
import { ensureSample, sampleRoot } from "@/lib/seed-sample";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { path?: unknown };
    if (typeof body.path !== "string") {
      throw new SafeError("Enter a folder path to scan.");
    }
    const requested = path.resolve(body.path.trim());
    if (requested === path.resolve(sampleRoot())) {
      await ensureSample();
    }
    const result = await scanDirectory(body.path);
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  if (error instanceof SafeError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  return Response.json(
    { error: "Something went wrong while reading that folder." },
    { status: 500 },
  );
}
