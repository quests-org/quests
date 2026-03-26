import { envForProviderConfigs } from "@quests/ai-gateway";
import { defineCommand } from "just-bash";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import type { AppConfig } from "../app-config/types";

import { APP_FOLDER_NAMES } from "../../constants";
import { getWorkspaceServerURL } from "../../logic/server/url";
import { absolutePathJoin } from "../absolute-path-join";
import { execaNodeForApp } from "../execa-node-for-app";
import { filterShellOutput } from "../filter-shell-output";
import { firstString } from "./utils";

export const TS_COMMAND = {
  description:
    "Execute a TypeScript or JavaScript file. For quick one-liners, prefer -e <code> over writing a file.",
  name: "tsx",
} as const;

export function createTsCommand(appConfig: AppConfig) {
  return defineCommand(TS_COMMAND.name, async (args, ctx) => {
    const appCwd = absolutePathJoin(
      appConfig.appDir,
      ctx.fs.resolvePath(ctx.cwd, "."),
    );

    if (args.length === 0) {
      return {
        exitCode: 1,
        stderr: `${TS_COMMAND.name} command requires a file argument (e.g., ${TS_COMMAND.name} scripts/setup.ts). Running ${TS_COMMAND.name} without arguments spawns an interactive shell.`,
        stdout: "",
      };
    }

    const KNOWN_OPTIONS = {
      e: { type: "string" },
      eval: { type: "string" },
      v: { type: "boolean" },
      version: { type: "boolean" },
    } as const;

    const { positionals, tokens, values } = parseArgs({
      allowPositionals: true,
      args,
      options: KNOWN_OPTIONS,
      strict: false,
      tokens: true,
    });

    if (values.v === true || values.version === true) {
      return {
        exitCode: 0,
        stderr: "",
        stdout: `node ${process.version}`,
      };
    }

    const unknownOptions = tokens
      .filter((t) => t.kind === "option" && !(t.name in KNOWN_OPTIONS))
      .map((t) => `--${(t as { kind: "option"; name: string }).name}`);
    if (unknownOptions.length > 0) {
      appConfig.workspaceConfig.captureException(
        new Error(
          `[ts] Unrecognized options ignored: ${unknownOptions.join(", ")}`,
        ),
      );
    }

    const evalCode = firstString(values.e, values.eval);

    let filePath: string;
    let scriptArgs: string[];

    if (evalCode === undefined) {
      const rawFilePath = positionals[0];

      if (rawFilePath === undefined) {
        return {
          exitCode: 1,
          stderr: `${TS_COMMAND.name} requires exactly one file path as a positional argument (e.g., ${TS_COMMAND.name} scripts/setup.ts).`,
          stdout: "",
        };
      }

      // Use the virtual FS to resolve the path so that traversals like ../foo.ts
      // are clamped within the sandbox root before mapping to the host filesystem.
      filePath = absolutePathJoin(
        appConfig.appDir,
        ctx.fs.resolvePath(ctx.cwd, rawFilePath),
      );

      // Everything after the file path token in the original args is forwarded to
      // the script as its own argv (flags like --file, --output, extra positionals).
      const filePathIndex = args.indexOf(rawFilePath);
      scriptArgs = args.slice(filePathIndex + 1);
    } else {
      const tmpDir = absolutePathJoin(appConfig.appDir, APP_FOLDER_NAMES.tmp);
      await mkdir(tmpDir, { recursive: true });
      filePath = absolutePathJoin(tmpDir, `ts-eval-${Date.now()}.ts`);
      await writeFile(filePath, evalCode, "utf8");
      scriptArgs = [];
    }

    const providerEnv = envForProviderConfigs({
      configs: appConfig.workspaceConfig.getAIProviderConfigs(),
      workspaceServerURL: getWorkspaceServerURL(),
    });

    // Use pnpm dlx for faster execution via cached packages and avoid
    // installing all packages eagerly.
    const execResult = await execaNodeForApp(
      appConfig,
      appConfig.workspaceConfig.pnpmBinPath,
      ["dlx", "jiti", filePath, ...scriptArgs],
      // Don't reject so we can filter the output
      { all: true, cancelSignal: ctx.signal, env: providerEnv, reject: false },
      appCwd,
    );
    const combined = filterShellOutput(execResult.all, appConfig.appDir);

    return {
      exitCode: execResult.exitCode ?? 1,
      stderr: "",
      stdout: combined,
    };
  });
}
