import { NextResponse } from "next/server";
import { getHitomiGallery, randomHitomiId } from "@/lib/hitomi";
import { getGallery, getRandomId } from "@/lib/nhentai";
import { parseSource } from "@/lib/query";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const source = parseSource(new URL(request.url).searchParams.get("source") ?? undefined);
  try {
    if (source === "hitomi") {
      const id = await randomHitomiId();
      await getHitomiGallery(id);
      return new NextResponse(null, {
        status: 307,
        headers: { Location: `/h/${id}` },
      });
    }
    const id = await getRandomId();
    await getGallery(id);
    return new NextResponse(null, {
      status: 307,
      headers: { Location: `/g/${id}` },
    });
  } catch {
    const home = source === "hitomi" ? "/?source=hitomi&random=failed" : "/?random=failed";
    return new NextResponse(null, {
      status: 307,
      headers: { Location: home },
    });
  }
}
