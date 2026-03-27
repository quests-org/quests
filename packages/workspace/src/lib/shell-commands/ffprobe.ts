import { execa } from "execa";
import { defineCommand } from "just-bash";

import type { AppConfig } from "../app-config/types";

import { FFPROBE_PATH } from "../ffmpeg";
import { filterShellOutput } from "../filter-shell-output";
import { resolveCommandContext, resolvePathArgs } from "./utils";

export const FFPROBE_COMMAND = {
  description: "Probe and inspect audio and video files using FFprobe.",
  name: "ffprobe",
} as const;

export function createFfprobeCommand(appConfig: AppConfig) {
  return defineCommand(FFPROBE_COMMAND.name, async (args, ctx) => {
    const { appCwd, env } = resolveCommandContext(appConfig, ctx);

    const result = await execa(
      FFPROBE_PATH,
      resolvePathArgs(args, appConfig, ctx),
      {
        all: true,
        cancelSignal: ctx.signal,
        cwd: appCwd,
        env: {
          ...appConfig.workspaceConfig.nodeExecEnv,
          ...env,
        },
        reject: false,
        stdin: "ignore",
      },
    );

    const combined = filterShellOutput(result.all, appConfig.appDir);
    return {
      exitCode: result.exitCode ?? 1,
      stderr: "",
      stdout: combined,
    };
  });
}
