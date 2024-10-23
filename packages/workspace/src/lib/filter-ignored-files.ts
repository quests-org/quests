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
}) {
  const files = await fs.readdir(rootDir, { withFileTypes: true });
  const results: string[] = [];

  for (const file of files) {
    const fullPath = absolutePathJoin(rootDir, file.name);
    const relativePath = path.relative(rootDir, fullPath);

    // Skip dot-prefixed files and folders by default
    if (file.name.startsWith(".")) {
      continue;
    }

    if (!ignore.ignores(relativePath)) {
      if (file.isDirectory()) {
        const subFiles = await filterIgnoredFiles({
          ignore,
          rootDir: fullPath,
        });
        results.push(
          ...subFiles.map((subFile) => path.join(file.name, subFile)),
        );
      } else {
        results.push(file.name);
      }
    }
  }

  return results;
}
