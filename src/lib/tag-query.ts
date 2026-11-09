export type TagMode = "include" | "exclude";

export type TagClause = {
  type: string;
  value: string;
  mode: TagMode;
};

const TAG_TYPES = new Set([
  "tag",
  "artist",
  "character",
  "parody",
  "group",
  "language",
  "category",
]);

const MAX_QUERY = 400;
const MAX_TAGS = 12;

export function normalizeTagValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export function tagKey(clause: Pick<TagClause, "type" | "value">): string {
  return `${clause.type}:${normalizeTagValue(clause.value)}`;
}

export function formatClause(clause: TagClause): string {
  const value = normalizeTagValue(clause.value);
  const quoted = /[^a-z0-9-]/.test(value) ? `"${value.replace(/"/g, "")}"` : value;
  return `${clause.mode === "exclude" ? "-" : ""}${clause.type}:${quoted}`;
}

export function tagLabel(value: string): string {
  return normalizeTagValue(value).replace(/-/g, " ");
}

function nextSpace(input: string, index: number): number {
  const end = input.indexOf(" ", index);
  return end === -1 ? input.length : end;
}

export function parseSearchQuery(raw: string): { text: string; tags: TagClause[] } {
  const tags: TagClause[] = [];
  const words: string[] = [];
  const input = raw.trim();
  let index = 0;

  while (index < input.length) {
    while (input[index] === " ") index += 1;
    if (index >= input.length) break;

    const start = index;
    let exclude = false;
    if (input[index] === "-") {
      exclude = true;
      index += 1;
    }

    const typeMatch = /^([a-z]+):/.exec(input.slice(index));
    if (typeMatch && TAG_TYPES.has(typeMatch[1])) {
      index += typeMatch[0].length;
      let value = "";
      if (input[index] === '"') {
        index += 1;
        const end = input.indexOf('"', index);
        if (end === -1) {
          value = input.slice(index);
          index = input.length;
        } else {
          value = input.slice(index, end);
          index = end + 1;
        }
      } else {
        const end = nextSpace(input, index);
        value = input.slice(index, end);
        index = end;
      }
      const normalized = normalizeTagValue(value);
      if (normalized) {
        tags.push({
          type: typeMatch[1],
          value: normalized,
          mode: exclude ? "exclude" : "include",
        });
      }
      continue;
    }

    index = start;
    const end = nextSpace(input, index);
    const word = input.slice(index, end);
    if (word) words.push(word);
    index = end;
  }

  return { text: words.join(" "), tags };
}

export function buildSearchQuery(text: string, tags: TagClause[]): string {
  const parts = [...tags.map(formatClause), text.trim()].filter(Boolean);
  const kept: string[] = [];
  for (const part of parts) {
    const next = [...kept, part].join(" ");
    if (next.length > MAX_QUERY) break;
    kept.push(part);
  }
  return kept.join(" ");
}

export function cycleTag(
  tags: TagClause[],
  next: { type: string; value: string },
): TagClause[] {
  const value = normalizeTagValue(next.value);
  if (!value || !TAG_TYPES.has(next.type)) return tags;
  const key = tagKey({ type: next.type, value });
  const index = tags.findIndex((clause) => tagKey(clause) === key);
  if (index === -1) {
    if (tags.length >= MAX_TAGS) return tags;
    return [...tags, { type: next.type, value, mode: "include" }];
  }
  if (tags[index].mode === "include") {
    return tags.map((clause, i) =>
      i === index ? { ...clause, mode: "exclude" } : clause,
    );
  }
  return tags.filter((_, i) => i !== index);
}

export function withLanguage(query: string, language: string | null): string {
  const parsed = parseSearchQuery(query);
  const tags = parsed.tags.filter((clause) => clause.type !== "language");
  const value = language ? normalizeTagValue(language) : "";
  if (value) tags.push({ type: "language", value, mode: "include" });
  return buildSearchQuery(parsed.text, tags);
}

export function activeLanguage(query: string): string {
  return (
    parseSearchQuery(query).tags.find(
      (clause) => clause.type === "language" && clause.mode === "include",
    )?.value ?? ""
  );
}
