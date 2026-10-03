import { resetSample } from "@/lib/seed-sample";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const restored = await resetSample();
    return Response.json({ path: restored });
  } catch {
    return Response.json(
      { error: "Could not restore the sample closet." },
      { status: 500 },
    );
  }
}
