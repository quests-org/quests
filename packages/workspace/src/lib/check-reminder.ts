import path from "node:path";

import { RunDiagnostics } from "../tools/run-diagnostics";
import { supportsDiagnostics } from "./run-diagnostics";

const SVG_EXTENSION = ".svg";

export function checkReminder(filePath: string): null | string {
  if (supportsDiagnostics(filePath)) {
    return `When you're done with your current set of changes to this file, you should call the ${RunDiagnostics.name} tool to check for any new errors.`;
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext === SVG_EXTENSION) {
    // cspell:ignore svglint
    return `IMPORTANT: SVG syntax errors can prevent the entire image from rendering for the user. You should run \`pnpm dlx svglint ${filePath}\` to validate complex SVGs.`;
  }

  return null;
}
