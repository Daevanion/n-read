import { SafeError } from "@/lib/errors";
import { removeEntries } from "@/lib/remove";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { scanId?: unknown; ids?: unknown };
    if (typeof body.scanId !== "string" || !Array.isArray(body.ids)) {
      throw new SafeError("Scan the folder again before deleting.");
    }
    const ids = body.ids.filter((id): id is string => typeof id === "string");
    const result = await removeEntries(body.scanId, ids);
    return Response.json(result);
  } catch (error) {
    if (error instanceof SafeError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "Something went wrong while deleting." },
      { status: 500 },
    );
  }
}
