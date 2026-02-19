import { describe, expect, it } from "vitest";

import { sanitizeFilename } from "./sanitize-filename";

describe("sanitizeFilename", () => {
  it.each([
    ["plain ASCII filename unchanged", "report.pdf", "report.pdf"],
    ["filename with spaces unchanged", "my report.pdf", "my report.pdf"],
    // cspell:ignore résumé
    ["strips diacritics", "résumé.pdf", "resume.pdf"],
    ["strips diacritics in extension", "file.pñg", "file.png"],
    ["strips non-ASCII Unicode (e.g. CJK)", "文件.png", "file.png"],
    [
      "real-world screenshot filename unchanged",
      "Screenshot 2026-02-19 at 9.11.07 AM.png",
      "Screenshot 2026-02-19 at 9.11.07 AM.png",
    ],
    [
      "macOS screenshot filenames with narrow space (U+202F) normalized to regular space",
      "Screenshot 2026-02-19 at 9.47.51 AM",
      "Screenshot 2026-02-19 at 9.47.51 AM",
    ],
    ["collapses multiple spaces", "my  file.txt", "my file.txt"],
    ["collapses multiple dashes", "my--file.txt", "my-file.txt"],
    ["trims leading/trailing spaces", " file.txt ", "file.txt"],
    [
      "falls back to 'file' when base is empty after sanitizing",
      "文件",
      "file",
    ],
    // NFKD compatibility decomposition
    ["decomposes fi ligature (U+FB01)", "ﬁle.txt", "file.txt"],
    ["decomposes superscript 2 (U+00B2)", "CO\u00B2.txt", "CO2.txt"],
    // length cap
    [
      "truncates base to 200 characters",
      `${"a".repeat(201)}.txt`,
      `${"a".repeat(200)}.txt`,
    ],
  ])("%s", (_label, input, expected) => {
    expect(sanitizeFilename(input)).toBe(expected);
  });
});
