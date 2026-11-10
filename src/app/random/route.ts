import { NextResponse } from "next/server";
import { getGallery, getRandomId } from "@/lib/nhentai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const id = await getRandomId();
    await getGallery(id);
    return new NextResponse(null, {
      status: 307,
      headers: { Location: `/g/${id}` },
    });
  } catch {
    return new NextResponse(null, {
      status: 307,
      headers: { Location: "/?random=failed" },
    });
  }
}
