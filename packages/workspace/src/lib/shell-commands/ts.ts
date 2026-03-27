import { defineCommand } from "just-bash";
import { mkdir, writeFile } from "node:fs/promises";

import type { AppConfig } from "../app-config/types";

import { APP_FOLDER_NAMES } from "../../constants";
import { absolutePathJoin } from "../absolute-path-join";
import { runPnpmCommand } from "../run-pnpm";
import {
  extractFileAndScriptArgs,
  firstString,
  parseCommandArgs,
  resolveCommandContext,
} from "./utils";

export const TS_COMMAND = {
  description:
    "Execute a TypeScript or JavaScript file. For quick one-liners, prefer -e <code> over writing a file.",
  name: "tsx",
} as const;

const KNOWN_OPTIONS = {
  e: { type: "string" },
  eval: { type: "string" },
  v: { type: "boolean" },
  version: { type: "boolean" },
} as const;

export function createTsCommand(appConfig: AppConfig) {
  return defineCommand(TS_COMMAND.name, async (args, ctx) => {
    const { appCwd, env } = resolveCommandContext(appConfig, ctx);

    if (args.length === 0) {
      return {
        exitCode: 1,
        stderr: `${TS_COMMAND.name} command requires a file argument (e.g., ${TS_COMMAND.name} scripts/setup.ts). Running ${TS_COMMAND.name} without arguments spawns an interactive shell.`,
        stdout: "",
      };
    }

    const { positionals, values } = parseCommandArgs(
      appConfig,
      "ts",
      args,
      KNOWN_OPTIONS,
    );

    if (values.v === true || values.version === true) {
      return {
        exitCode: 0,
        stderr: "",
        stdout: `node ${process.version}`,
      };
    }

    const evalCode = firstString(values.e, values.eval);

    let filePath: string;
    let scriptArgs: string[];

    if (evalCode === undefined) {
      const fileAndArgs = extractFileAndScriptArgs(positionals, args, (p) =>
        ctx.fs.resolvePath(ctx.cwd, p),
      );

      if (fileAndArgs === undefined) {
        return {
          exitCode: 1,
          stderr: `${TS_COMMAND.name} requires exactly one file path as a positional argument (e.g., ${TS_COMMAND.name} scripts/setup.ts).`,
          stdout: "",
        };
      }

      ({ filePath, scriptArgs } = fileAndArgs);
    } else {
      const tmpDir = absolutePathJoin(appConfig.appDir, APP_FOLDER_NAMES.tmp);
      await mkdir(tmpDir, { recursive: true });
      filePath = absolutePathJoin(tmpDir, `ts-eval-${Date.now()}.ts`);
      await writeFile(filePath, evalCode, "utf8");
      scriptArgs = [];
    }

    // Use pnpm dlx for faster execution via cached packages and avoid
    // installing all packages eagerly.
    const result = await runPnpmCommand({
      appConfig,
      args: ["dlx", "jiti", filePath, ...scriptArgs],
      cwd: appCwd,
      env,
      signal: ctx.signal,
    });

    return {
      exitCode: result.exitCode,
      stderr: "",
      stdout: result.combined,
    };
  });
}
