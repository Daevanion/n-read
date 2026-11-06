import { NextRequest } from "next/server";
import { errorMessage } from "@/lib/errors";
import { searchTags } from "@/lib/nhentai";
import { parseQuery } from "@/lib/query";

export async function GET(request: NextRequest) {
  const q = parseQuery(request.nextUrl.searchParams.get("q") ?? undefined);
  if (q.length < 2) return Response.json([]);
  try {
    const tags = await searchTags(q, 8);
    return Response.json(tags);
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 502 });
  }
}
