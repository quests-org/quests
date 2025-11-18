import invariant from "tiny-invariant";
import { describe, expect, it } from "vitest";

import { PROJECT_SUBDOMAIN_MODE_PREFIXES } from "../constants";
import { ADJECTIVES, buildFolderName, NOUNS } from "./generate-folder-name";

describe("generate-folder-name", () => {
  it("should not contain reserved prefixes in adjectives", () => {
    const reservedPrefixes = Object.values(PROJECT_SUBDOMAIN_MODE_PREFIXES);
    const reservedSet = new Set(reservedPrefixes);
    const conflictingAdjectives = ADJECTIVES.filter((adj) =>
      reservedSet.has(adj),
    );

    expect(conflictingAdjectives).toEqual([]);
  });

  it("should never generate folder names exceeding 63 characters", () => {
    const sortedAdjectives = [...ADJECTIVES].sort(
      (a, b) => b.length - a.length,
    );
    const longestAdjective = sortedAdjectives[0];
    const secondLongestAdjective = sortedAdjectives[1];
    const sortedNouns = [...NOUNS].sort((a, b) => b.length - a.length);
    const longestNoun = sortedNouns[0];
    invariant(
      longestAdjective && secondLongestAdjective && longestNoun,
      "No longest adjective or noun found",
    );

    const longestTwoDigitNumber = 99;
    const folderNameWithNumber = buildFolderName(
      longestAdjective,
      secondLongestAdjective,
      longestNoun,
      longestTwoDigitNumber,
    );

    const maxTimestamp = 9_999_999_999_999;
    const folderNameWithTimestamp = buildFolderName(
      longestAdjective,
      secondLongestAdjective,
      longestNoun,
      maxTimestamp,
    );

    expect(folderNameWithNumber.length).toBeLessThanOrEqual(63);
    expect(folderNameWithTimestamp.length).toBeLessThanOrEqual(63);
  });
});
