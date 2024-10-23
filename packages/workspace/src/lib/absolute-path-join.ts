import path from "node:path";

import { type AbsolutePath, AbsolutePathSchema } from "../schemas/paths";

export function absolutePathJoin(rootDir: AbsolutePath, ...paths: string[]) {
  return AbsolutePathSchema.parse(path.join(rootDir, ...paths));
}
