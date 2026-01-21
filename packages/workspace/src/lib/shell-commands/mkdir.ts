import fs from "node:fs/promises";
import { parseArgs } from "node:util";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { ensureRelativePath } from "../ensure-relative-path";
import { executeError } from "../execute-error";
import { type FileOperationResult } from "./types";
import { shellSuccess, validateNoGlobs } from "./utils";

const COMMAND_NAME = "mkdir";

export const MKDIR_COMMAND = {
  description: `usage: ${COMMAND_NAME} [-p] directory_name ...`,
  examples: [
    `${COMMAND_NAME} src/utils`,
    `${COMMAND_NAME} -p src/components/ui/buttons`,
  ],
  name: COMMAND_NAME,
} as const;

export async function mkdirCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  if (args.length === 0) {
    return executeError(
      `${MKDIR_COMMAND.name} command requires at least 1 argument\n${MKDIR_COMMAND.description}`,
    );
  }

  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: {
      p: { type: "boolean" },
    },
    strict: false,
  });

  const recursive = Boolean(values.p);
  const directoryPaths = positionals;

  if (directoryPaths.length === 0) {
    if (recursive) {
      return executeError(
        `${MKDIR_COMMAND.name} -p command requires at least 1 path argument\n${MKDIR_COMMAND.description}`,
      );
    }
    return executeError(
      `${MKDIR_COMMAND.name} command requires valid path arguments\n${MKDIR_COMMAND.description}`,
    );
  }

  if (directoryPaths.some((p) => !p)) {
    return executeError(
      `${MKDIR_COMMAND.name} command requires valid path arguments\n${MKDIR_COMMAND.description}`,
    );
  }

  const globValidation = validateNoGlobs(directoryPaths, MKDIR_COMMAND.name);
  if (globValidation.isErr()) {
    return globValidation;
  }

  for (const directoryPath of directoryPaths) {
    const fixedPathResult = ensureRelativePath(directoryPath);
    if (fixedPathResult.isErr()) {
      return fixedPathResult;
    }

    const absolutePath = absolutePathJoin(
      appConfig.appDir,
      fixedPathResult.value,
    );

    try {
      await fs.mkdir(absolutePath, { recursive });
    } catch (error) {
      return executeError(
        `${MKDIR_COMMAND.name} command failed for '${directoryPath}': ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  const pathsStr = directoryPaths.join(" ");
  const command = recursive
    ? `${MKDIR_COMMAND.name} -p ${pathsStr}`
    : `${MKDIR_COMMAND.name} ${pathsStr}`;
  return shellSuccess({ command });
}
