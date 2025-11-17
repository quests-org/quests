import { describe, expect, it } from "vitest";

import { PROJECT_SUBDOMAIN_MODE_PREFIXES } from "../constants";
import { ADJECTIVES } from "./generate-folder-name";

describe("generate-folder-name", () => {
  it("should not contain reserved prefixes in adjectives", () => {
    const reservedPrefixes = Object.values(PROJECT_SUBDOMAIN_MODE_PREFIXES);
    const reservedSet = new Set(reservedPrefixes);
    const conflictingAdjectives = ADJECTIVES.filter((adj) =>
      reservedSet.has(adj),
    );

    expect(conflictingAdjectives).toEqual([]);
  });
});
