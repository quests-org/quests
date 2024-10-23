import nodeIgnore from "ignore";
import fs from "node:fs/promises";
import path from "node:path";

import { type AbsolutePath } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { fileExists } from "./file-exists";

export async function getIgnore(
  rootDir: AbsolutePath,
  options?: { signal?: AbortSignal },
) {
  const gitIgnorePath = absolutePathJoin(rootDir, ".gitignore");
  const exists = await fileExists(gitIgnorePath);
  if (!exists) {
    return nodeIgnore();
  }
  const gitignorePath = path.join(rootDir, ".gitignore");
  const gitignoreContent = await fs.readFile(gitignorePath, {
    encoding: "utf8",
    signal: options?.signal,
  });

  return nodeIgnore().add(gitignoreContent).add(".git");
}
