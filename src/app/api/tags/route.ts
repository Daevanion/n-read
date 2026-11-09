import { NextRequest } from "next/server";
import { errorMessage } from "@/lib/errors";
import { listTagsByType } from "@/lib/nhentai";
import { isTagType } from "@/lib/query";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") ?? "tag";
  if (!isTagType(type)) {
    return Response.json({ error: "Unknown tag type." }, { status: 400 });
  }
  try {
    const tags = await listTagsByType(type, 1, 36);
    return Response.json(
      tags.map((tag) => ({
        id: tag.id,
        type: tag.type,
        name: tag.name,
        slug: tag.slug,
        url: tag.url,
        count: tag.count,
      })),
    );
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 502 });
  }
}
