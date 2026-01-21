import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { ensureRelativePath } from "../ensure-relative-path";
import { executeError } from "../execute-error";
import { pathExists } from "../path-exists";
import { type FileOperationResult } from "./types";
import { shellSuccess, validateNoGlobs } from "./utils";

const USAGE =
  "usage: cp [-r] source_file target_file\n       cp [-r] source_file ... target_directory";

export const CP_COMMAND = {
  description: USAGE,
  examples: [
    "cp src/file.ts src/file-copy.ts",
    "cp -r src/components src/components-backup",
  ],
};

export async function cpCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  if (args.length < 2) {
    return executeError(`cp command requires at least 2 arguments\n${USAGE}`);
  }

  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: {
      r: { type: "boolean" },
    },
    strict: false,
  });

  const recursive = Boolean(values.r);

  if (positionals.length < 2) {
    if (recursive) {
      return executeError(
        `cp -r command requires at least 2 path arguments\n${USAGE}`,
      );
    }
    return executeError(
      `cp command requires at least 2 path arguments\n${USAGE}`,
    );
  }

  const sourcePaths = positionals.slice(0, -1);
  const destPath = positionals.at(-1) ?? "";

  if (sourcePaths.length === 0 || !destPath) {
    return executeError(
      `cp command requires valid source and destination path arguments\n${USAGE}`,
    );
  }

  const allPaths = [...sourcePaths, destPath];
  const globValidation = validateNoGlobs(allPaths, "cp");
  if (globValidation.isErr()) {
    return globValidation;
  }

  const fixedDestResult = ensureRelativePath(destPath);
  if (fixedDestResult.isErr()) {
    return fixedDestResult;
  }

  const absoluteDestPath = absolutePathJoin(
    appConfig.appDir,
    fixedDestResult.value,
  );

  let destIsDirectory = false;
  try {
    const destStats = await fs.stat(absoluteDestPath);
    destIsDirectory = destStats.isDirectory();
  } catch {
    destIsDirectory = false;
  }

  if (sourcePaths.length > 1 && !destIsDirectory) {
    return executeError(`cp: target '${destPath}' is not a directory`);
  }

  for (const sourcePath of sourcePaths) {
    const fixedSourceResult = ensureRelativePath(sourcePath);
    if (fixedSourceResult.isErr()) {
      return fixedSourceResult;
    }

    const absoluteSourcePath = absolutePathJoin(
      appConfig.appDir,
      fixedSourceResult.value,
    );

    const sourceExists = await pathExists(absoluteSourcePath);
    if (!sourceExists) {
      return executeError(
        `cp: cannot stat '${sourcePath}': No such file or directory`,
      );
    }

    try {
      const stats = await fs.stat(absoluteSourcePath);

      if (stats.isDirectory()) {
        if (!recursive) {
          return executeError(
            `cp: -r not specified; omitting directory '${sourcePath}'`,
          );
        }

        const finalDestPath = destIsDirectory
          ? path.join(absoluteDestPath, path.basename(absoluteSourcePath))
          : absoluteDestPath;

        await fs.cp(absoluteSourcePath, finalDestPath, {
          force: true,
          recursive: true,
        });
      } else {
        const finalDestPath = destIsDirectory
          ? path.join(absoluteDestPath, path.basename(absoluteSourcePath))
          : absoluteDestPath;

        await fs.copyFile(absoluteSourcePath, finalDestPath);
      }
    } catch (error) {
      return executeError(
        `cp command failed for '${sourcePath}': ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  const pathsStr = [...sourcePaths, destPath].join(" ");
  const command = recursive ? `cp -r ${pathsStr}` : `cp ${pathsStr}`;
  return shellSuccess({ command });
}
