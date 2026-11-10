const TYPE_ALIAS: Record<string, string> = {
  parody: "series",
  category: "type",
};

export function splitHitomiQuery(raw: string): { expression: string; title: string } {
  const tags: string[] = [];
  const words: string[] = [];
  for (const token of raw.trim().split(/\s+/)) {
    if (!token) continue;
    const match = /^(-?)([a-z]+):([^\s]+)$/i.exec(token);
    if (!match) {
      words.push(token);
      continue;
    }
    const type = TYPE_ALIAS[match[2].toLowerCase()] ?? match[2].toLowerCase();
    tags.push(`${match[1]}${type}:${match[3].replace(/-/g, "_")}`);
  }
  return { expression: tags.join(" "), title: words.join(" ") };
}

export function hitomiPageIsSafe(expression: string, title: string): boolean {
  if (title) return false;
  if (/(^|\s)-/.test(expression)) return false;
  const extras = expression
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.split(":")[0])
    .filter((type) => type && type !== "language");
  return extras.length <= 1;
}
