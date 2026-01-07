import fs from "node:fs/promises";
import path from "node:path";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { ensureRelativePath } from "../ensure-relative-path";
import { pathExists } from "../path-exists";
import { createError, createSuccess, type FileOperationResult } from "./types";
import { validateArgCount } from "./utils";

export async function mvCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  const argsResult = validateArgCount(
    "mv",
    args,
    2,
    "mv <source> <destination>",
  );
  if (argsResult.isErr()) {
    return argsResult;
  }

  const [sourcePath, destPath] = argsResult.value;

  if (!sourcePath || !destPath) {
    return createError(
      "mv command requires exactly 2 arguments: mv <source> <destination>",
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
      `mv: cannot stat '${sourcePath}': No such file or directory`,
    );
  }

  const destDir = path.dirname(absoluteDestPath);
  try {
    await fs.access(destDir);
  } catch {
    return createError(
      `mv: cannot move '${sourcePath}' to '${destPath}': No such file or directory`,
    );
  }

  if (absoluteSourcePath === absoluteDestPath) {
    return createSuccess(`mv ${sourcePath} ${destPath}`);
  }

  try {
    await fs.rename(absoluteSourcePath, absoluteDestPath);
    return createSuccess(`mv ${sourcePath} ${destPath}`);
  } catch (error) {
    return createError(
      `mv command failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
