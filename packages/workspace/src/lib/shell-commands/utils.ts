import { parseArgs, type ParseArgsConfig } from "node:util";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";

/** Extract the resolved file path and trailing script args from positionals + original args. */
export function extractFileAndScriptArgs(
  positionals: string[],
  args: string[],
  resolvePath: (path: string) => string,
): undefined | { filePath: string; scriptArgs: string[] } {
  const rawFilePath = positionals[0];
  if (rawFilePath === undefined) {
    return undefined;
  }

  const filePath = virtualToRelativePath(resolvePath(rawFilePath));
  const filePathIndex = args.indexOf(rawFilePath);
  const scriptArgs = args.slice(filePathIndex + 1);

  return { filePath, scriptArgs };
}

/** Pick the first string value from a set of aliased parseArgs values. */
export function firstString(
  ...values: ((boolean | string)[] | boolean | string | undefined)[]
): string | undefined {
  return values.find((v): v is string => typeof v === "string");
}

/** Parse args and warn about unrecognized options via captureException. */
export function parseCommandArgs<
  T extends NonNullable<ParseArgsConfig["options"]>,
>(appConfig: AppConfig, commandName: string, args: string[], options: T) {
  const result = parseArgs({
    allowPositionals: true,
    args,
    options,
    strict: false,
    tokens: true,
  });

  const unknownOptions = result.tokens
    .filter((t) => t.kind === "option" && !(t.name in options))
    .map((t) => `--${(t as { kind: "option"; name: string }).name}`);

  if (unknownOptions.length > 0) {
    appConfig.workspaceConfig.captureException(
      new Error(
        `[${commandName}] Unrecognized options ignored: ${unknownOptions.join(", ")}`,
      ),
    );
  }

  return result;
}

/** Resolve the effective cwd and env for a shell command. */
export function resolveCommandContext(
  appConfig: AppConfig,
  ctx: {
    cwd: string;
    env: Map<string, string>;
    fs: { resolvePath(cwd: string, path: string): string };
  },
) {
  return {
    appCwd: absolutePathJoin(
      appConfig.appDir,
      ctx.fs.resolvePath(ctx.cwd, "."),
    ),
    env: Object.fromEntries(ctx.env),
  };
}

/** Extract a string array from a parseArgs multi-value option. */
export function stringArray(
  value: (boolean | string)[] | boolean | string | undefined,
): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

/** Strip the leading `/` from a virtual sandbox path to make it relative to the sandbox root. */
function virtualToRelativePath(virtualPath: string): string {
  return virtualPath.startsWith("/") ? virtualPath.slice(1) : virtualPath;
}
