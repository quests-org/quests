import { Bash, defineCommand, ReadWriteFs } from "just-bash";

import type { AppConfig } from "./app-config/types";

import { pnpmCommand } from "./shell-commands/pnpm";
import { tsCommand } from "./shell-commands/ts";
import { tscCommand } from "./shell-commands/tsc";

export function createBashEnv(appConfig: AppConfig) {
  const fs = new ReadWriteFs({ root: appConfig.appDir });

  return new Bash({
    customCommands: [
      createPnpmCommand(appConfig),
      createTsCommand(appConfig),
      createTsxAliasCommand(appConfig),
      createTscCommand(appConfig),
    ],
    cwd: "/",
    fs,
  });
}

function createPnpmCommand(appConfig: AppConfig) {
  return defineCommand("pnpm", async (args, ctx) => {
    const result = await pnpmCommand(args, appConfig, ctx.signal);
    if (result.isOk()) {
      return {
        exitCode: result.value.exitCode,
        stderr: "",
        stdout: result.value.combined,
      };
    }
    return { exitCode: 1, stderr: result.error.message, stdout: "" };
  });
}

function createTscCommand(appConfig: AppConfig) {
  return defineCommand("tsc", async (args, ctx) => {
    const result = await tscCommand(args, appConfig, ctx.signal);
    if (result.isOk()) {
      return {
        exitCode: result.value.exitCode,
        stderr: "",
        stdout: result.value.combined,
      };
    }
    return { exitCode: 1, stderr: result.error.message, stdout: "" };
  });
}

function createTsCommand(appConfig: AppConfig) {
  return defineCommand("ts", async (args, ctx) => {
    const result = await tsCommand(args, appConfig, ctx.signal);
    if (result.isOk()) {
      return {
        exitCode: result.value.exitCode,
        stderr: "",
        stdout: result.value.combined,
      };
    }
    return { exitCode: 1, stderr: result.error.message, stdout: "" };
  });
}

function createTsxAliasCommand(appConfig: AppConfig) {
  return defineCommand("tsx", async (args, ctx) => {
    const result = await tsCommand(args, appConfig, ctx.signal);
    if (result.isOk()) {
      return {
        exitCode: result.value.exitCode,
        stderr: "",
        stdout: result.value.combined,
      };
    }
    return { exitCode: 1, stderr: result.error.message, stdout: "" };
  });
}
