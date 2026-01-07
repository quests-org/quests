import { ok } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { ensureRelativePath } from "../ensure-relative-path";
import { listFiles } from "../list-files";
import { pathExists } from "../path-exists";
import { type FileOperationResult } from "./types";
import { executeError, validateNoGlobs } from "./utils";

export async function lsCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  const KNOWN_FLAGS = new Set(["-a"]);
  const warnings: string[] = [];

  let showHidden = false;
  let targetPath = ".";
  const flags: string[] = [];
  const pathArgs: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("-")) {
      flags.push(arg);
    } else {
      pathArgs.push(arg);
    }
  }

  for (const flag of flags) {
    if (KNOWN_FLAGS.has(flag)) {
      if (flag === "-a") {
        showHidden = true;
      }
    } else {
      warnings.push(
        `ls: unknown flag '${flag}' ignored (supported flags: ${[...KNOWN_FLAGS].join(", ")})`,
      );
    }
  }

  targetPath = pathArgs[0] ?? ".";

  const globValidation = validateNoGlobs([targetPath], "ls");
  if (globValidation.isErr()) {
    return globValidation;
  }

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
    return executeError(
      `ls: cannot access '${targetPath}': No such file or directory`,
    );
  }

  try {
    const stats = await fs.stat(absolutePath);

    const flagStr = flags.length > 0 ? ` ${flags.join(" ")}` : "";
    const pathStr = targetPath === "." ? "" : ` ${targetPath}`;
    const commandStr = `ls${flagStr}${pathStr}`.trim();
    const stderr = warnings.length > 0 ? warnings.join("\n") : "";

    if (!stats.isDirectory()) {
      return ok({
        command: commandStr,
        exitCode: 0,
        stderr,
        stdout: path.basename(absolutePath),
      });
    }

    const result = await listFiles(appConfig.appDir, {
      hidden: showHidden,
      searchPath: fixedPathResult.value,
    });

    return ok({
      command: commandStr,
      exitCode: 0,
      stderr,
      stdout: result.files.join("\n"),
    });
  } catch (error) {
    return executeError(
      `ls command failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
