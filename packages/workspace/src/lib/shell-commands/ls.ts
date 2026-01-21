import { ok } from "neverthrow";
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

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
  const IGNORED_FLAGS = new Set([
    "1",
    "A",
    "color",
    "F",
    "G",
    "h",
    "i",
    "l",
    "p",
    "r",
    "S",
    "s",
    "t",
    "U",
  ]);
  const warnings: string[] = [];

  const { positionals, tokens, values } = parseArgs({
    allowPositionals: true,
    args,
    options: {
      a: { type: "boolean" },
      // Ignored flags
      1: { type: "boolean" },
      A: { type: "boolean" },
      color: { type: "boolean" },
      F: { type: "boolean" },
      G: { type: "boolean" },
      h: { type: "boolean" },
      i: { type: "boolean" },
      l: { type: "boolean" },
      p: { type: "boolean" },
      r: { type: "boolean" },
      S: { type: "boolean" },
      s: { type: "boolean" },
      t: { type: "boolean" },
      U: { type: "boolean" },
    },
    strict: false,
    tokens: true,
  });

  const showHidden = Boolean(values.a);

  // Warn about unknown flags
  for (const token of tokens) {
    if (
      token.kind === "option" &&
      !IGNORED_FLAGS.has(token.name) &&
      token.name !== "a"
    ) {
      warnings.push(
        `ls: unknown flag '-${token.name}' ignored (supported flags: -a)`,
      );
    }
  }

  const targetPaths = positionals.length > 0 ? positionals : ["."];

  const globValidation = validateNoGlobs(targetPaths, "ls");
  if (globValidation.isErr()) {
    return globValidation;
  }

  // Reconstruct command string from original args
  const flagArgs = args.filter((arg) => arg.startsWith("-"));
  const flagStr = flagArgs.length > 0 ? ` ${flagArgs.join(" ")}` : "";
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

  const outputParts: string[] = [];
  if (warnings.length > 0) {
    outputParts.push(warnings.join("\n"));
  }
  if (outputs.length > 0) {
    outputParts.push(outputs.join("\n"));
  }

  return ok({
    combined: outputParts.join("\n"),
    command: commandStr,
    exitCode: 0,
  });
}
