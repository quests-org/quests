import { describe, expect, it } from "vitest";

import { truncateBuffer } from "./truncate-buffer";

describe("truncateBuffer", () => {
  it("should return empty string for empty buffer", () => {
    const buffer = Buffer.from("");
    expect(truncateBuffer(buffer, 10)).toBe("");
  });

  it("should return full string when buffer is shorter than max length", () => {
    const buffer = Buffer.from("hello");
    expect(truncateBuffer(buffer, 10)).toBe("hello");
  });

  it("should truncate buffer when longer than max length", () => {
    const buffer = Buffer.from("hello world this is a long string");
    const result = truncateBuffer(buffer, 10);
    const truncationMessage = "... (truncated";
    expect(result).toContain(truncationMessage);
    expect(result.length).toBeLessThanOrEqual(
      10 + truncationMessage.length + 20,
    ); // maxLength + truncation message
  });
});
