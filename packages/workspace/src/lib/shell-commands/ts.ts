import { envForProviderConfigs } from "@quests/ai-gateway";
import { ok } from "neverthrow";
import { parseArgs } from "node:util";

import type { AppConfig } from "../app-config/types";

import { getWorkspaceServerURL } from "../../logic/server/url";
import { execaNodeForApp } from "../execa-node-for-app";
import { executeError } from "../execute-error";
import { filterShellOutput } from "../filter-shell-output";
import { type FileOperationResult } from "./types";

const COMMAND_NAME = "ts";
export const TS_COMMAND = {
  description: "Execute a TypeScript or JavaScript file, powered by Jiti.",
  examples: [`${COMMAND_NAME} scripts/setup.ts`],
  name: COMMAND_NAME,
} as const;

export async function tsCommand(
  args: string[],
  appConfig: AppConfig,
  signal?: AbortSignal,
): Promise<FileOperationResult> {
  if (args.length === 0) {
    return executeError(
      `${TS_COMMAND.name} command requires a file argument (e.g., ${TS_COMMAND.name} scripts/setup.ts). Running ${TS_COMMAND.name} without arguments spawns an interactive shell.`,
    );
  }

  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: {
      e: { type: "string" },
      eval: { type: "string" },
    },
    strict: false,
  });

  if (values.e !== undefined || values.eval !== undefined) {
    return executeError(
      `${TS_COMMAND.name} does not support the -e/--eval flag for evaluating code strings directly. Instead, write your code to a .ts or .js file and execute it with ${TS_COMMAND.name}.`,
    );
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
    ["dlx", "jiti", filePath, ...scriptArgs],
    // Don't reject so we can filter the output
    { all: true, cancelSignal: signal, env: providerEnv, reject: false },
  );
  const combined = filterShellOutput(execResult.all, appConfig.appDir);

  return ok({
    combined,
    command: `${TS_COMMAND.name} ${args.join(" ")}`,
    exitCode: execResult.exitCode ?? 1,
  });
}
