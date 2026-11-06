export function formatCount(value: number | undefined): string {
  if (value == null || Number.isNaN(value)) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

export function formatUploaded(unixSeconds: number): string {
  if (!unixSeconds) return "Unknown date";
  const date = new Date(unixSeconds * 1000);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export function formatPages(count: number | undefined): string {
  const n = count ?? 0;
  return n === 1 ? "1 page" : `${n} pages`;
}
