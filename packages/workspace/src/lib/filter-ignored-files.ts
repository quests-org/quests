import { type Ignore } from "ignore";
import fs from "node:fs/promises";
import path from "node:path";

import { type AbsolutePath } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";

export async function filterIgnoredFiles({
  ignore,
  rootDir,
}: {
  ignore: Ignore;
  rootDir: AbsolutePath;
}): Promise<{ emptyDirs: string[]; files: string[] }> {
  const files = await fs.readdir(rootDir, { withFileTypes: true });
  const results: string[] = [];
  const emptyDirs: string[] = [];

  for (const file of files) {
    const fullPath = absolutePathJoin(rootDir, file.name);
    const relativePath = path.relative(rootDir, fullPath);

    // Skip dot-prefixed files and folders by default
    if (file.name.startsWith(".")) {
      continue;
    }

    if (!ignore.ignores(relativePath)) {
      if (file.isDirectory()) {
        const { emptyDirs: subEmptyDirs, files: subFiles } =
          await filterIgnoredFiles({
            ignore,
            rootDir: fullPath,
          });

        if (subFiles.length === 0) {
          // Directory has no visible files, mark it as empty
          emptyDirs.push(file.name);
        } else {
          results.push(
            ...subFiles.map((subFile) => path.join(file.name, subFile)),
          );
        }

        // Add subdirectory empty dirs with proper path
        emptyDirs.push(
          ...subEmptyDirs.map((emptyDir) => path.join(file.name, emptyDir)),
        );
      } else {
        results.push(file.name);
      }
    }
  }

  return { emptyDirs, files: results };
}
