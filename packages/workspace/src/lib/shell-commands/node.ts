import { execa } from "execa";
import { defineCommand } from "just-bash";
import { parseArgs } from "node:util";

import type { AppConfig } from "../app-config/types";

import { type AbsolutePath } from "../../schemas/paths";
import { absolutePathJoin } from "../absolute-path-join";
import { filterShellOutput } from "../filter-shell-output";
import { TS_COMMAND } from "./ts";
import { firstString, stringArray } from "./utils";

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
    const appCwd = absolutePathJoin(
      appConfig.appDir,
      ctx.fs.resolvePath(ctx.cwd, "."),
    );
    const env = Object.fromEntries(ctx.env);

    if (args.length === 0) {
      return {
        exitCode: 1,
        stderr: `node command requires a file argument or -e <code>. Prefer \`${TS_COMMAND.name}\` for TypeScript files.`,
        stdout: "",
      };
    }

    const { positionals, tokens, values } = parseArgs({
      allowPositionals: true,
      args,
      options: KNOWN_OPTIONS,
      strict: false,
      tokens: true,
    });

    const unknownOptions = tokens
      .filter((t) => t.kind === "option" && !(t.name in KNOWN_OPTIONS))
      .map((t) => `--${(t as { kind: "option"; name: string }).name}`);
    if (unknownOptions.length > 0) {
      appConfig.workspaceConfig.captureException(
        new Error(
          `[node] Unrecognized options ignored: ${unknownOptions.join(", ")}`,
        ),
      );
    }

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

    const rawFilePath = positionals[0];
    if (rawFilePath === undefined) {
      return {
        exitCode: 1,
        stderr: "node requires a file path argument.",
        stdout: "",
      };
    }

    const filePath = absolutePathJoin(
      appConfig.appDir,
      ctx.fs.resolvePath(ctx.cwd, rawFilePath),
    );

    const filePathIndex = args.indexOf(rawFilePath);
    const scriptArgs = args.slice(filePathIndex + 1);

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
