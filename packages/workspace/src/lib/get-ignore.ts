import nodeIgnore from "ignore";
import fs from "node:fs/promises";
import path from "node:path";

import { type AbsolutePath } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { pathExists } from "./path-exists";

export async function getIgnore(
  rootDir: AbsolutePath,
  options?: { includeGit?: boolean; signal?: AbortSignal },
) {
  const gitIgnorePath = absolutePathJoin(rootDir, ".gitignore");
  const exists = await pathExists(gitIgnorePath);
  if (!exists) {
    return nodeIgnore();
  }
  const gitignorePath = path.join(rootDir, ".gitignore");
  const gitignoreContent = await fs.readFile(gitignorePath, {
    encoding: "utf8",
    signal: options?.signal,
  });

  const ignore = nodeIgnore().add(gitignoreContent);
  return options?.includeGit ? ignore : ignore.add(".git");
}
