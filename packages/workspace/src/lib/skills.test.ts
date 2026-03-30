import { describe, expect, it } from "vitest";

import { parseFrontmatter } from "./skills";

const make = (frontmatter: string, body = "Body content") =>
  `---\n${frontmatter}\n---\n${body}`;

describe("parseFrontmatter", () => {
  it("parses typical skill file", () => {
    const result = parseFrontmatter(make("description: Does a thing"));
    expect(result).toEqual({
      body: "Body content",
      description: "Does a thing",
    });
  });

  it("returns null when description is missing", () => {
    expect(parseFrontmatter(make("name: foo"))).toBeNull();
  });

  it("returns null when there is no frontmatter", () => {
    expect(parseFrontmatter("Just plain content")).toBeNull();
  });

  it("handles Windows-style CRLF line endings", () => {
    const raw = "---\r\ndescription: Windows skill\r\n---\r\nBody";
    expect(parseFrontmatter(raw)).toEqual({
      body: "Body",
      description: "Windows skill",
    });
  });

  it("falls back to sanitizer for description with colon (invalid YAML)", () => {
    const result = parseFrontmatter(make("description: Foo: bar baz"));
    expect(result).toEqual({
      body: "Body content",
      description: "Foo: bar baz",
    });
  });

  it("trims leading/trailing whitespace from body", () => {
    const result = parseFrontmatter(
      `---\ndescription: Trimmed\n---\n\n  Body\n`,
    );
    expect(result?.body).toBe("Body");
  });
});
