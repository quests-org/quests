import { describe, expect, it } from "vitest";

import { canonicalizeAnthropicModelId } from "./canonicalize-model-id";

describe("canonicalizeAnthropicModelId", () => {
  it.each([
    ["claude-sonnet-4-5-20250929", "claude-sonnet-4.5"],
    ["claude-haiku-4-5-20251001", "claude-haiku-4.5"],
    ["claude-opus-4-1-20250805", "claude-opus-4.1"],
    ["claude-sonnet-4-6", "claude-sonnet-4.6"],
    ["claude-haiku-4-5", "claude-haiku-4.5"],
  ])("canonicalizes %s to %s", (input, expected) => {
    expect(canonicalizeAnthropicModelId(input)).toBe(expected);
  });

  it.each([
    ["claude-sonnet-4-5-19991231"],
    ["claude-sonnet-4.5"],
    ["claude-3-opus"],
  ])("returns %s unchanged", (input) => {
    expect(canonicalizeAnthropicModelId(input)).toBe(input);
  });
});
