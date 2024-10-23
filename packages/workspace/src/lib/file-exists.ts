import fs from "node:fs/promises";

import { type AbsolutePath } from "../schemas/paths";

export async function fileExists(filePath: AbsolutePath): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
