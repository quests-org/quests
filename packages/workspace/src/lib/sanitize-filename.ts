import path from "node:path";

const MAX_FILENAME_BASE_LENGTH = 200;

export function sanitizeFilename(filename: string): string {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);

  const sanitizedBase = sanitizeAscii(base)
    .replaceAll(/\s+/g, " ")
    .replaceAll(/-{2,}/g, "-")
    .trim()
    .slice(0, MAX_FILENAME_BASE_LENGTH);

  return `${sanitizedBase || "file"}${sanitizeAscii(ext).trim()}`;
}

function sanitizeAscii(str: string): string {
  return (
    str
      // NFKD decomposes compatibility equivalents (e.g. ﬁ -> fi, ² -> 2) in
      // addition to stripping diacritics (e.g. é -> e)
      .normalize("NFKD")
      .replaceAll(/[\u0300-\u036F]/g, "")
      // Replace Unicode whitespace (e.g. narrow no-break space U+202F from macOS) with a regular space
      .replaceAll(/[^\S\u0020]/g, " ")
      // Replace any remaining non-ASCII characters with nothing
      .replaceAll(/[^\u0020-\u007E]/g, "")
  );
}
