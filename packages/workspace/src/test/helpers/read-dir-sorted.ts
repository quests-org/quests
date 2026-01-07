import fs from "node:fs/promises";

export async function readDirSorted(dirPath: string) {
  const files = await fs.readdir(dirPath);
  return files.sort();
}
