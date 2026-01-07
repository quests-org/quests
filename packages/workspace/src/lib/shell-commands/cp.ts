import fs from "node:fs/promises";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { ensureRelativePath } from "../ensure-relative-path";
import { pathExists } from "../path-exists";
import { createError, createSuccess, type FileOperationResult } from "./types";

export async function cpCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  if (args.length === 0) {
    return createError(
      "cp command requires at least 2 arguments: cp [-r] <source> <destination>",
    );
  }

  let recursive = false;
  let sourcePath: string;
  let destPath: string;

  if (args[0] === "-r") {
    if (args.length !== 3) {
      return createError(
        "cp -r command requires exactly 2 path arguments: cp -r <source> <destination>",
      );
    }
    recursive = true;
    sourcePath = args[1] ?? "";
    destPath = args[2] ?? "";
  } else {
    if (args.length !== 2) {
      return createError(
        "cp command requires exactly 2 arguments: cp <source> <destination>",
      );
    }
    sourcePath = args[0] ?? "";
    destPath = args[1] ?? "";
  }

  if (!sourcePath || !destPath) {
    return createError(
      "cp command requires valid source and destination path arguments",
    );
  }

  const fixedSourceResult = ensureRelativePath(sourcePath);
  if (fixedSourceResult.isErr()) {
    return fixedSourceResult;
  }

  const fixedDestResult = ensureRelativePath(destPath);
  if (fixedDestResult.isErr()) {
    return fixedDestResult;
  }

  const absoluteSourcePath = absolutePathJoin(
    appConfig.appDir,
    fixedSourceResult.value,
  );
  const absoluteDestPath = absolutePathJoin(
    appConfig.appDir,
    fixedDestResult.value,
  );

  const sourceExists = await pathExists(absoluteSourcePath);
  if (!sourceExists) {
    return createError(
      `cp: cannot stat '${sourcePath}': No such file or directory`,
    );
  }

  try {
    const stats = await fs.stat(absoluteSourcePath);

    if (stats.isDirectory()) {
      if (!recursive) {
        return createError(
          `cp: -r not specified; omitting directory '${sourcePath}'`,
        );
      }

      await fs.cp(absoluteSourcePath, absoluteDestPath, {
        force: true,
        recursive: true,
      });
      return createSuccess(`cp -r ${sourcePath} ${destPath}`);
    } else {
      await fs.copyFile(absoluteSourcePath, absoluteDestPath);
      const command = recursive
        ? `cp -r ${sourcePath} ${destPath}`
        : `cp ${sourcePath} ${destPath}`;
      return createSuccess(command);
    }
  } catch (error) {
    return createError(
      `cp command failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
