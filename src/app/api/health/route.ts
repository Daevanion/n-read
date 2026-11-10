import { cacheBackend } from "@/lib/store";

export function GET() {
  return Response.json({ ok: true, cache: cacheBackend() });
}
