const ENTITY_MAP = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
  "#39": "'",
};

export function stripRichTextToPlainText(value = "") {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&([a-z#0-9]+);/gi, (match, entity) => ENTITY_MAP[entity.toLowerCase()] ?? match)
    .replace(/\r/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function createPlainTextPreview(value = "", fallback = "", maxLength = 220) {
  const plainText = stripRichTextToPlainText(value);
  const source = plainText || fallback;
  if (!source) {
    return "";
  }
  if (source.length <= maxLength) {
    return source;
  }
  return `${source.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function hasMeaningfulText(value = "") {
  return Boolean(stripRichTextToPlainText(value));
}
