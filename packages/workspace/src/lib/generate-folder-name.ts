import { draw } from "radashi";

import { type AbsolutePath } from "../schemas/paths";
import { SubdomainPartSchema } from "../schemas/subdomain-part";
import { absolutePathJoin } from "./absolute-path-join";
import { pathExists } from "./path-exists";

const ADJECTIVES = [
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

const NOUNS = [
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

export async function generateNewFolderName(absolutePath: AbsolutePath) {
  const adjective = draw(ADJECTIVES);
  const noun = draw(NOUNS);
  const baseNameWithoutNumber = `${adjective}-${noun}`;

  let folderName: string;
  do {
    const randomThreeDigit = Math.floor(Math.random() * 90) + 10;
    folderName = `${baseNameWithoutNumber}-${randomThreeDigit}`;
  } while (await pathExists(absolutePathJoin(absolutePath, folderName)));

  return SubdomainPartSchema.parse(folderName);
}
