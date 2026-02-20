import fs from "node:fs/promises";

import { type AbsolutePath } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";
import { pathExists } from "./path-exists";

interface ListFilesResult {
  files: string[];
  truncated: boolean;
}

export async function listFiles(
  rootDir: AbsolutePath,
  options: {
    hidden?: boolean;
    searchPath?: string;
    signal?: AbortSignal;
  } = {},
): Promise<ListFilesResult> {
  const targetPath = options.searchPath
    ? absolutePathJoin(rootDir, options.searchPath)
    : rootDir;

  const exists = await pathExists(targetPath);
  if (!exists) {
    return { files: [], truncated: false };
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });

  const files = entries
    .filter((entry) => options.hidden || !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  return { files, truncated: false };
}
