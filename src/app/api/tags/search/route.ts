import { NextRequest } from "next/server";
import { errorMessage } from "@/lib/errors";
import { searchHitomiTags } from "@/lib/hitomi";
import { searchTags } from "@/lib/nhentai";
import { parseQuery, parseSource } from "@/lib/query";

export async function GET(request: NextRequest) {
  const q = parseQuery(request.nextUrl.searchParams.get("q") ?? undefined);
  if (q.length < 2) return Response.json([]);
  const source = parseSource(request.nextUrl.searchParams.get("source") ?? undefined);
  try {
    const tags =
      source === "hitomi" ? await searchHitomiTags(q, 8) : await searchTags(q, 8);
    return Response.json(tags);
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 502 });
  }
}
