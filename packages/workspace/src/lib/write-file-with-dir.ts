import fs from "node:fs/promises";
import path from "node:path";

import { type AbsolutePath } from "../schemas/paths";

export async function writeFileWithDir(
  filePath: AbsolutePath,
  content: string,
  options?: { signal?: AbortSignal },
) {
  const dirPath = path.dirname(filePath);
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(
      `Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  try {
    await fs.writeFile(filePath, content, { signal: options?.signal });
  } catch (error) {
    throw new Error(
      `Failed to write file ${filePath}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
