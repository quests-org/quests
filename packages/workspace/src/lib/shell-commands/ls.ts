import { ok } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";
import { ensureRelativePath } from "../ensure-relative-path";
import { executeError } from "../execute-error";
import { listFiles } from "../list-files";
import { pathExists } from "../path-exists";
import { type FileOperationResult } from "./types";
import { validateNoGlobs } from "./utils";

const USAGE = "usage: ls [-a] [file ...]";

export const LS_COMMAND = {
  description: USAGE,
  examples: ["ls", "ls src", "ls -a src/components"],
};

export async function lsCommand(
  args: string[],
  appConfig: AppConfig,
): Promise<FileOperationResult> {
  const KNOWN_FLAGS = new Set(["-a"]);
  const warnings: string[] = [];

  let showHidden = false;
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

  const targetPaths = pathArgs.length > 0 ? pathArgs : ["."];

  const globValidation = validateNoGlobs(targetPaths, "ls");
  if (globValidation.isErr()) {
    return globValidation;
  }

  const flagStr = flags.length > 0 ? ` ${flags.join(" ")}` : "";
  const pathStr =
    targetPaths.length === 1 && targetPaths[0] === "."
      ? ""
      : ` ${targetPaths.join(" ")}`;
  const commandStr = `ls${flagStr}${pathStr}`.trim();

  const outputs: string[] = [];

  for (const [index, targetPath] of targetPaths.entries()) {
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

      if (stats.isDirectory()) {
        const result = await listFiles(appConfig.appDir, {
          hidden: showHidden,
          searchPath: fixedPathResult.value,
        });

        if (targetPaths.length > 1) {
          if (index > 0) {
            outputs.push("");
          }
          outputs.push(`${targetPath}:`, result.files.join("\n"));
        } else {
          outputs.push(result.files.join("\n"));
        }
      } else {
        outputs.push(path.basename(absolutePath));
      }
    } catch (error) {
      return executeError(
        `ls command failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  const stderr = warnings.length > 0 ? warnings.join("\n") : "";

  return ok({
    command: commandStr,
    exitCode: 0,
    stderr,
    stdout: outputs.join("\n"),
  });
}
