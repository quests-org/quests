import { describe, expect, it } from "vitest";

import { normalizePath } from "./normalize-path";

describe("normalizePath", () => {
  it.each([
    {
      expected: "path/to/file.txt",
      input: "path\\to\\file.txt",
      label: "should convert backslashes to forward slashes",
    },
    {
      expected: "path/to/file.txt",
      input: "path\\to/file.txt",
      label: "should handle mixed separators",
    },
    {
      expected: "path/to/file.txt",
      input: "path/to/file.txt",
      label: "should leave forward slashes unchanged",
    },
    {
      expected: "",
      input: "",
      label: "should handle empty string",
    },
    {
      expected: "path/to/file.txt",
      input: ".\\path\\to\\file.txt",
      label: "should normalize relative paths with dot notation",
    },
    {
      expected: "path/to/file.txt",
      input: "path\\\\to\\\\file.txt",
      label: "should normalize multiple consecutive backslashes",
    },
  ])("$label", ({ expected, input }) => {
    expect(normalizePath(input)).toBe(expected);
  });
});
