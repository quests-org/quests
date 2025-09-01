import fs from "node:fs/promises";

import { type AbsolutePath } from "../schemas/paths";
import { absolutePathJoin } from "./absolute-path-join";

export async function readFileWithAnyCase(
  directoryPath: AbsolutePath,
  fileName: string,
): Promise<null | string> {
  try {
    const exactFilePath = absolutePathJoin(directoryPath, fileName);
    const content = await fs.readFile(exactFilePath, "utf8");
    return content;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      return null;
    }

    try {
      const files = await fs.readdir(directoryPath);

      const matchingFile = files.find(
        (file) => file.toLowerCase() === fileName.toLowerCase(),
      );

      if (!matchingFile) {
        return null;
      }

      const actualFilePath = absolutePathJoin(directoryPath, matchingFile);
      const content = await fs.readFile(actualFilePath, "utf8");
      return content;
    } catch {
      return null;
    }
  }
}
