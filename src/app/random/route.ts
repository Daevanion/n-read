import { NextResponse } from "next/server";
import { getGallery, getRandomId } from "@/lib/nhentai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const id = await getRandomId();
      try {
        await getGallery(id);
        return new NextResponse(null, {
          status: 307,
          headers: { Location: `/g/${id}` },
        });
      } catch {
        // Skip blocked or missing ids and roll again.
      }
    }
  } catch {
    // Fall through to the home notice.
  }
  return new NextResponse(null, {
    status: 307,
    headers: { Location: "/?random=failed" },
  });
}
