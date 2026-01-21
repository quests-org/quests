import fs from "node:fs/promises";
import { parseArgs } from "node:util";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { ensureRelativePath } from "../ensure-relative-path";
import { executeError } from "../execute-error";
import { pathExists } from "../path-exists";
import { type FileOperationResult } from "./types";
import { shellSuccess, validateNoGlobs } from "./utils";

const COMMAND_NAME = "rm";

export const RM_COMMAND = {
  description: `usage: ${COMMAND_NAME} [-f] [-r] file ...`,
  examples: [
    `${COMMAND_NAME} src/temp.json`,
    `${COMMAND_NAME} -r build/`,
    `${COMMAND_NAME} file1.txt file2.txt file3.txt`,
    `${COMMAND_NAME} -rf dist/ build/`,
  ],
  name: COMMAND_NAME,
} as const;

export async function rmCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  if (args.length === 0) {
    return executeError(
      `${RM_COMMAND.name} command requires at least 1 argument\n${RM_COMMAND.description}`,
    );
  }

  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: {
      f: { type: "boolean" },
      r: { type: "boolean" },
    },
    strict: false,
  });

  const recursive = Boolean(values.r);
  const force = Boolean(values.f);
  const targetPaths = positionals;

  if (targetPaths.length === 0) {
    return executeError(
      `${RM_COMMAND.name} command requires at least 1 path argument after flags\n${RM_COMMAND.description}`,
    );
  }

  if (targetPaths.some((p) => !p)) {
    return executeError(
      `${RM_COMMAND.name} command requires valid path arguments\n${RM_COMMAND.description}`,
    );
  }

  const globValidation = validateNoGlobs(targetPaths, RM_COMMAND.name);
  if (globValidation.isErr()) {
    return globValidation;
  }

  for (const targetPath of targetPaths) {
    const fixedPathResult = ensureRelativePath(targetPath);
    if (fixedPathResult.isErr()) {
      return fixedPathResult;
    }

    const absolutePath = absolutePathJoin(
      appConfig.appDir,
      fixedPathResult.value,
    );

    const exists = await pathExists(absolutePath);
    if (!exists) {
      if (force) {
        continue;
      }
      return executeError(
        `${RM_COMMAND.name}: cannot remove '${targetPath}': No such file or directory`,
      );
    }

    try {
      const stats = await fs.stat(absolutePath);

      if (stats.isDirectory()) {
        if (!recursive) {
          return executeError(
            `${RM_COMMAND.name}: cannot remove '${targetPath}': Is a directory`,
          );
        }

        await fs.rm(absolutePath, { force: true, recursive: true });
      } else {
        await fs.unlink(absolutePath);
      }
    } catch (error) {
      if (force) {
        continue;
      }
      return executeError(
        `${RM_COMMAND.name} command failed for '${targetPath}': ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  const pathsStr = targetPaths.join(" ");
  const flags = [];
  if (recursive) {
    flags.push("-r");
  }
  if (force) {
    flags.push("-f");
  }
  const flagsStr = flags.length > 0 ? `${flags.join(" ")} ` : "";
  const command = `${RM_COMMAND.name} ${flagsStr}${pathsStr}`;
  return shellSuccess({ command });
}
