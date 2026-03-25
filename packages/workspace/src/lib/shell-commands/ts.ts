import { envForProviderConfigs } from "@quests/ai-gateway";
import { ok } from "neverthrow";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import type { AppConfig } from "../app-config/types";

import { APP_FOLDER_NAMES } from "../../constants";
import { getWorkspaceServerURL } from "../../logic/server/url";
import { type AbsolutePath } from "../../schemas/paths";
import { absolutePathJoin } from "../absolute-path-join";
import { execaNodeForApp } from "../execa-node-for-app";
import { executeError } from "../execute-error";
import { filterShellOutput } from "../filter-shell-output";
import { fixRelativePath } from "../fix-relative-path";
import { type FileOperationResult } from "./types";

export const TS_COMMAND = {
  // "tsx" is a well-known CLI tool for running TypeScript code, so if the agent
  // attempts to use it we silently remap it to this command rather than failing.
  // It is intentionally omitted from the tool description and visible command list.
  alias: "tsx",
  description:
    "Execute a TypeScript or JavaScript file, powered by Jiti. Supports -e/--eval for inline code evaluation.",
  name: "ts",
} as const;

export async function tsCommand(
  args: string[],
  appConfig: AppConfig,
  signal?: AbortSignal,
  cwd?: AbsolutePath,
): Promise<FileOperationResult> {
  if (args.length === 0) {
    return executeError(
      `${TS_COMMAND.name} command requires a file argument (e.g., ${TS_COMMAND.name} scripts/setup.ts). Running ${TS_COMMAND.name} without arguments spawns an interactive shell.`,
    );
  }

  const { positionals, tokens, values } = parseArgs({
    allowPositionals: true,
    args,
    options: {
      e: { type: "string" },
      eval: { type: "string" },
    },
    strict: false,
    tokens: true,
  });

  const unknownOptions = tokens
    .filter((t) => t.kind === "option" && !(t.name in values))
    .map((t) => `--${(t as { kind: "option"; name: string }).name}`);
  if (unknownOptions.length > 0) {
    appConfig.workspaceConfig.captureException(
      new Error(
        `[ts] Unrecognized options ignored: ${unknownOptions.join(", ")}`,
      ),
    );
  }

  const evalCode =
    typeof values.e === "string"
      ? values.e
      : typeof values.eval === "string"
        ? values.eval
        : undefined;

  if (evalCode !== undefined) {
    const tmpDir = absolutePathJoin(appConfig.appDir, APP_FOLDER_NAMES.tmp);
    await mkdir(tmpDir, { recursive: true });
    const tmpFile = absolutePathJoin(tmpDir, `ts-eval-${Date.now()}.ts`);
    await writeFile(tmpFile, evalCode, "utf8");

    const providerEnv = envForProviderConfigs({
      configs: appConfig.workspaceConfig.getAIProviderConfigs(),
      workspaceServerURL: getWorkspaceServerURL(),
    });

    const execResult = await execaNodeForApp(
      appConfig,
      appConfig.workspaceConfig.pnpmBinPath,
      ["dlx", "jiti", tmpFile],
      { all: true, cancelSignal: signal, env: providerEnv, reject: false },
      cwd,
    );
    const combined = filterShellOutput(execResult.all, appConfig.appDir);
    return ok({
      combined,
      command: `${TS_COMMAND.name} -e <code>`,
      exitCode: execResult.exitCode ?? 1,
    });
  }

  if (positionals.length === 0) {
    return executeError(
      `${TS_COMMAND.name} requires exactly one file path as a positional argument (e.g., ${TS_COMMAND.name} scripts/setup.ts).`,
    );
  }

  const filePath = positionals[0];
  if (!filePath) {
    return executeError(`${TS_COMMAND.name} requires a file path argument.`);
  }

  const fixedFilePath = fixRelativePath(filePath) ?? filePath;

  // Everything after the file path token in the original args is forwarded to
  // the script as its own argv (flags like --file, --output, extra positionals).
  const filePathIndex = args.indexOf(filePath);
  const scriptArgs = args.slice(filePathIndex + 1);

  const providerEnv = envForProviderConfigs({
    configs: appConfig.workspaceConfig.getAIProviderConfigs(),
    workspaceServerURL: getWorkspaceServerURL(),
  });

  // Use pnpm dlx for faster execution via cached packages and avoid
  // installing all packages eagerly.
  const execResult = await execaNodeForApp(
    appConfig,
    appConfig.workspaceConfig.pnpmBinPath,
    ["dlx", "jiti", fixedFilePath, ...scriptArgs],
    // Don't reject so we can filter the output
    { all: true, cancelSignal: signal, env: providerEnv, reject: false },
    cwd,
  );
  const combined = filterShellOutput(execResult.all, appConfig.appDir);

  return ok({
    combined,
    command: `${TS_COMMAND.name} ${args.join(" ")}`,
    exitCode: execResult.exitCode ?? 1,
  });
}
