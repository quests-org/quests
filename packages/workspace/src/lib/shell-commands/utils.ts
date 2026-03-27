import path from "node:path";
import { parseArgs, type ParseArgsConfig } from "node:util";

import type { AppConfig } from "../app-config/types";

import { absolutePathJoin } from "../absolute-path-join";

/**
 * Extract the resolved file path and trailing script args from positionals + original args.
 * Paths are returned relative to appCwd so the real host appDir is not exposed.
 * All path-like script args (absolute or relative traversals) are resolved through
 * the virtual FS so they land correctly regardless of the agent's cwd.
 */
export function extractFileAndScriptArgs(
  positionals: string[],
  args: string[],
  appConfig: AppConfig,
  appCwd: string,
  resolvePath: (path: string) => string,
): undefined | { filePath: string; scriptArgs: string[] } {
  const rawFilePath = positionals[0];
  if (rawFilePath === undefined) {
    return undefined;
  }

  const filePath = virtualToRealRelative(
    rawFilePath,
    appConfig,
    appCwd,
    resolvePath,
  );
  const filePathIndex = args.indexOf(rawFilePath);
  const rawScriptArgs = args.slice(filePathIndex + 1);
  const scriptArgs = rawScriptArgs.map((arg) =>
    looksLikePath(arg)
      ? virtualToRealRelative(arg, appConfig, appCwd, resolvePath)
      : arg,
  );

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

/**
 * Resolves any argument that looks like a virtual absolute path (starts with `/`)
 * into a real filesystem path under appDir. Non-path arguments are returned as-is.
 * This prevents sandbox-virtual absolute paths from leaking to the host system.
 */
export function resolvePathArgs(
  args: string[],
  appConfig: AppConfig,
  ctx: {
    cwd: string;
    fs: { resolvePath(cwd: string, path: string): string };
  },
): string[] {
  return args.map((arg) => {
    if (!arg.startsWith("/")) {
      return arg;
    }
    const virtualPath = ctx.fs.resolvePath(ctx.cwd, arg);
    return absolutePathJoin(appConfig.appDir, virtualPath);
  });
}

/** Extract a string array from a parseArgs multi-value option. */
export function stringArray(
  value: (boolean | string)[] | boolean | string | undefined,
): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

/**
 * Returns true for args that look like a file path and need sandbox resolution:
 * starts with `/` (virtual absolute) or starts with `.` or contains `/` (relative traversal).
 */
function looksLikePath(arg: string): boolean {
  return arg.startsWith("/") || arg.startsWith(".") || arg.includes("/");
}

/**
 * Resolve a virtual path to a real path, then relativize from appCwd so the
 * host appDir is never exposed to the subprocess.
 */
function virtualToRealRelative(
  virtualPath: string,
  appConfig: AppConfig,
  appCwd: string,
  resolvePath: (p: string) => string,
): string {
  const realAbs = absolutePathJoin(appConfig.appDir, resolvePath(virtualPath));
  return path.relative(appCwd, realAbs);
}
