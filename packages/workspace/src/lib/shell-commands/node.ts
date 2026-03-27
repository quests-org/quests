import { execa } from "execa";
import { defineCommand } from "just-bash";

import type { AppConfig } from "../app-config/types";

import { type AbsolutePath } from "../../schemas/paths";
import { filterShellOutput } from "../filter-shell-output";
import { TS_COMMAND } from "./ts";
import {
  extractFileAndScriptArgs,
  firstString,
  parseCommandArgs,
  resolveCommandContext,
  stringArray,
} from "./utils";

function execNode(
  appConfig: AppConfig,
  args: string[],
  signal?: AbortSignal,
  cwd?: AbsolutePath,
  env?: Record<string, string>,
) {
  return execa(process.execPath, args, {
    all: true,
    cancelSignal: signal,
    cwd: cwd ?? appConfig.appDir,
    env: {
      ...appConfig.workspaceConfig.nodeExecEnv,
      ...env,
    },
    reject: false,
    stdin: "ignore",
  });
}

const KNOWN_OPTIONS = {
  e: { type: "string" },
  eval: { type: "string" },
  import: { multiple: true, type: "string" },
  "input-type": { type: "string" },
  "max-old-space-size": { type: "string" },
  require: { multiple: true, type: "string" },
  v: { type: "boolean" },
  version: { type: "boolean" },
} as const;

export function createNodeCommand(appConfig: AppConfig) {
  return defineCommand("node", async (args, ctx) => {
    const { appCwd, env } = resolveCommandContext(appConfig, ctx);

    if (args.length === 0) {
      return {
        exitCode: 1,
        stderr: `node command requires a file argument or -e <code>. Prefer \`${TS_COMMAND.name}\` for TypeScript files.`,
        stdout: "",
      };
    }

    const { positionals, values } = parseCommandArgs(
      appConfig,
      "node",
      args,
      KNOWN_OPTIONS,
    );

    const isVersion = values.v === true || values.version === true;

    if (isVersion) {
      const execResult = await execNode(
        appConfig,
        ["--version"],
        ctx.signal,
        appCwd,
        env,
      );
      const combined = filterShellOutput(execResult.all, appConfig.appDir);
      return {
        exitCode: execResult.exitCode ?? 1,
        stderr: "",
        stdout: combined,
      };
    }

    const evalCode = firstString(values.e, values.eval);
    const inputType = firstString(values["input-type"]);
    const maxOldSpaceSize = firstString(values["max-old-space-size"]);
    const requires = stringArray(values.require);
    const imports = stringArray(values.import);

    const nodeFlags: string[] = [];
    if (inputType) {
      nodeFlags.push("--input-type", inputType);
    }
    if (maxOldSpaceSize) {
      nodeFlags.push(`--max-old-space-size=${maxOldSpaceSize}`);
    }
    for (const r of requires) {
      nodeFlags.push("--require", r);
    }
    for (const i of imports) {
      nodeFlags.push("--import", i);
    }

    if (evalCode !== undefined) {
      const execResult = await execNode(
        appConfig,
        [...nodeFlags, "-e", evalCode],
        ctx.signal,
        appCwd,
        env,
      );
      const combined = filterShellOutput(execResult.all, appConfig.appDir);
      return {
        exitCode: execResult.exitCode ?? 1,
        stderr: "",
        stdout: combined,
      };
    }

    if (positionals.length === 0) {
      return {
        exitCode: 1,
        stderr: "node requires a file path argument or -e <code>.",
        stdout: "",
      };
    }

    const fileAndArgs = extractFileAndScriptArgs(
      positionals,
      args,
      appConfig,
      appCwd,
      (p) => ctx.fs.resolvePath(ctx.cwd, p),
    );

    if (fileAndArgs === undefined) {
      return {
        exitCode: 1,
        stderr: "node requires a file path argument.",
        stdout: "",
      };
    }

    const { filePath, scriptArgs } = fileAndArgs;
    const execResult = await execNode(
      appConfig,
      [...nodeFlags, filePath, ...scriptArgs],
      ctx.signal,
      appCwd,
      env,
    );
    const combined = filterShellOutput(execResult.all, appConfig.appDir);

    return {
      exitCode: execResult.exitCode ?? 1,
      stderr: "",
      stdout: combined,
    };
  });
}
