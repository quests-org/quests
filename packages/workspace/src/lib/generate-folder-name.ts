import { draw } from "radashi";

import { type AbsolutePath } from "../schemas/paths";
import { SubdomainPartSchema } from "../schemas/subdomain-part";
import { absolutePathJoin } from "./absolute-path-join";
import { getCurrentDate } from "./get-current-date";
import { pathExists } from "./path-exists";

export const ADJECTIVES = [
  "bold",
  "brave",
  "bright",
  "brisk",
  "calm",
  "clear",
  "crisp",
  "dark",
  "deep",
  "eager",
  "fast",
  "final",
  "firm",
  "free",
  "fresh",
  "golden",
  "grand",
  "great",
  "hardy",
  "hidden",
  "iron",
  "keen",
  "light",
  "lone",
  "lost",
  "loyal",
  "new",
  "night",
  "nimble",
  "plain",
  "proud",
  "pure",
  "quick",
  "quiet",
  "rare",
  "red",
  "safe",
  "sharp",
  "silver",
  "sleek",
  "steady",
  "stone",
  "stout",
  "swift",
  "true",
  "vast",
  "vivid",
  "wild",
  "wise",
] as const;

export const NOUNS = [
  "base",
  "bay",
  "beacon",
  "blade",
  "book",
  "bridge",
  "camp",
  "cave",
  "chest",
  "core",
  "cove",
  "dock",
  "door",
  "edge",
  "field",
  "forge",
  "fork",
  "fort",
  "gate",
  "grove",
  "guard",
  "guild",
  "hall",
  "haven",
  "hill",
  "isle",
  "keep",
  "key",
  "lab",
  "lake",
  "land",
  "light",
  "link",
  "map",
  "mine",
  "node",
  "path",
  "peak",
  "point",
  "port",
  "ridge",
  "ring",
  "road",
  "route",
  "seal",
  "shield",
  "site",
  "star",
  "step",
  "stone",
  "tower",
  "track",
  "trail",
  "vault",
  "view",
  "ward",
  "way",
  "wood",
  "zone",
] as const;

export function buildFolderName(
  firstAdjective: string,
  secondAdjective: string,
  noun: string,
  suffix: number | string,
): string {
  const baseNameWithoutNumber = `${firstAdjective}-${secondAdjective}-${noun}`;
  return `${baseNameWithoutNumber}-${suffix}`;
}

export async function generateNewFolderName(absolutePath: AbsolutePath) {
  const firstAdjective = draw(ADJECTIVES);
  const remainingAdjectives = ADJECTIVES.filter(
    (adj) => adj !== firstAdjective,
  );
  const secondAdjective = draw(remainingAdjectives) ?? "unknown";
  const noun = draw(NOUNS);

  let folderName: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    if (attempts >= maxAttempts) {
      const timestamp = getCurrentDate().getTime();
      folderName = buildFolderName(
        firstAdjective,
        secondAdjective,
        noun,
        timestamp,
      );
      break;
    }

    const randomTwoDigit = Math.floor(Math.random() * 90) + 10;
    folderName = buildFolderName(
      firstAdjective,
      secondAdjective,
      noun,
      randomTwoDigit,
    );
    attempts++;
  } while (await pathExists(absolutePathJoin(absolutePath, folderName)));

  return SubdomainPartSchema.parse(folderName);
}
