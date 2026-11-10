export const ANON_PER_MINUTE: Record<string, number> = {
  search: 18,
  tagged: 18,
  galleries: 24,
  popular: 18,
  gallery: 30,
  random: 12,
  tags: 20,
  tagsSearch: 20,
  cdn: 6,
  other: 20,
};

export const MAX_PACE_WAIT_MS = 8_000;

type Bucket = { tokens: number; updated: number };

export function endpointBucket(path: string, method = "GET"): string {
  const clean = path.split("?")[0] ?? path;
  if (method.toUpperCase() === "POST" && clean.startsWith("/tags/search")) {
    return "tagsSearch";
  }
  if (clean.startsWith("/search")) return "search";
  if (clean.startsWith("/galleries/tagged")) return "tagged";
  if (clean.startsWith("/galleries/popular")) return "popular";
  if (clean.startsWith("/galleries/random")) return "random";
  if (/^\/galleries\/\d+/.test(clean)) return "gallery";
  if (clean.startsWith("/galleries")) return "galleries";
  if (clean.startsWith("/tags")) return "tags";
  if (clean.startsWith("/cdn")) return "cdn";
  return "other";
}

export function createPacer(now: () => number = Date.now) {
  const buckets = new Map<string, Bucket>();

  return {
    reserve(key: string, perMinute: number): number {
      const rate = Math.max(perMinute, 1);
      const refillPerMs = rate / 60_000;
      const t = now();
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { tokens: rate, updated: t };
        buckets.set(key, bucket);
      } else {
        const elapsed = Math.max(0, t - bucket.updated);
        bucket.tokens = Math.min(rate, bucket.tokens + elapsed * refillPerMs);
        bucket.updated = t;
      }
      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return 0;
      }
      const wait = Math.ceil((1 - bucket.tokens) / refillPerMs);
      bucket.tokens -= 1;
      return wait;
    },
  };
}
