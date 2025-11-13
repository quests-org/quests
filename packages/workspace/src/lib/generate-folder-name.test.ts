import { describe, expect, it } from "vitest";

import { PROJECT_CHAT_MODE_PREFIX } from "../constants";
import { ADJECTIVES } from "./generate-folder-name";

describe("generate-folder-name", () => {
  it("should not contain reserved prefixes in adjectives", () => {
    const reservedPrefixes = [PROJECT_CHAT_MODE_PREFIX];
    const reservedSet = new Set(reservedPrefixes);
    const conflictingAdjectives = ADJECTIVES.filter((adj) =>
      reservedSet.has(adj),
    );

    expect(conflictingAdjectives).toEqual([]);
  });
});
