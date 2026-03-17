import path from "node:path";

import { APP_FOLDER_NAMES } from "../constants";
import { TOOL_NAMES } from "../tools/name";
import { TSC_COMMAND } from "./shell-commands/tsc";

const SVG_EXTENSION = ".svg";

const SUPPORTED_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
]);

export function checkReminder(filePath: string): null | string {
  if (supportsDiagnostics(filePath)) {
    const tscCommand = buildTscCommand(filePath);
    return `Run \`${tscCommand}\` using the \`${TOOL_NAMES.runShellCommand}\` tool to check for type errors before finishing.`;
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext === SVG_EXTENSION) {
    // cspell:ignore svglint
    return `IMPORTANT: SVG syntax errors can prevent the entire image from rendering for the user. You should run \`pnpm dlx svglint ${filePath}\` to validate complex SVGs.`;
  }

  return null;
}

function buildTscCommand(filePath: string): string {
  const normalized = filePath.replace(/^\.\//, "");
  const parts = normalized.split("/");

  // If the file is inside a skill folder (skills/<name>/...), use that skill's tsconfig
  if (parts[0] === APP_FOLDER_NAMES.skills && parts.length >= 3) {
    const skillName = parts[1];
    if (skillName) {
      return `${TSC_COMMAND.name} --noEmit --project ${parts[0]}/${skillName}/tsconfig.json`;
    }
  }

  return `${TSC_COMMAND.name} --noEmit`;
}

function supportsDiagnostics(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
}
