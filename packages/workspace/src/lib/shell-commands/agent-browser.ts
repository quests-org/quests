import { execa } from "execa";
import { defineCommand } from "just-bash";
import os from "node:os";
import path from "node:path";
import { dedent } from "radashi";

import type { AppConfig } from "../app-config/types";

import { APP_FOLDER_NAMES } from "../../constants";
import { CDP_PAGE_PATH_PREFIX } from "../../logic/server/routes/cdp-bridge";
import { getWorkspaceServerPort } from "../../logic/server/url";
import { absolutePathJoin } from "../absolute-path-join";
import { AGENT_BROWSER_PATH } from "../agent-browser";
import { isProjectSubdomain } from "../is-app";
import { resolveCommandContext, resolvePathArgs } from "./utils";

export const AGENT_BROWSER_COMMAND = {
  description: dedent`
    Control a built-in Chromium browser to navigate the web, interact with pages, and extract content.
    IMPORTANT: You MUST load the \`agent-browser\` skill before using this command. Do not run any agent-browser commands until the skill is loaded.
    Do NOT pass --cdp, --session, or --auto-connect flags; these are injected automatically.
  `.trim(),
  name: "agent-browser",
} as const;
const MAX_OUTPUT_LENGTH = 30_000;

// Fixed short path to avoid the OS unix socket path limit (~104/108 bytes on macOS/Linux)
// and prevent conflicts with other agent-browser instances on the system.
const SOCKET_DIR = path.join(os.tmpdir(), "quests-agent-browser");

// Flags that configure the CDP endpoint or session - these are injected
// automatically and must not be passed by the caller.
const BLOCKED_FLAGS = new Set(["--auto-connect", "--cdp", "--session"]);

export function createAgentBrowserCommand(appConfig: AppConfig) {
  return defineCommand(AGENT_BROWSER_COMMAND.name, async (args, ctx) => {
    const { workspaceConfig } = appConfig;
    const serverPort = getWorkspaceServerPort();

    if (!isProjectSubdomain(appConfig.subdomain)) {
      return {
        exitCode: 1,
        stderr:
          "agent-browser: browser is only available in project contexts.\n",
        stdout: "",
      };
    }

    const subdomain = appConfig.subdomain;

    // Reject any attempt to override CDP connection flags.
    const blockedArg = args.find((a) => BLOCKED_FLAGS.has(a));
    if (blockedArg) {
      return {
        exitCode: 1,
        stderr: `agent-browser: flag ${blockedArg} is not allowed. The browser session is managed automatically.\n`,
        stdout: "",
      };
    }

    // Ensure a browser target exists for this project before handing off to the
    // agent-browser daemon so it has something to connect to.
    const existingTargets =
      await workspaceConfig.browser.listTargets(subdomain);
    let targetId: string;
    if (existingTargets.length > 0 && existingTargets[0]) {
      targetId = existingTargets[0].id;
    } else {
      const created = await workspaceConfig.browser.createTarget(subdomain);
      targetId = created.targetId;
    }

    const cdpUrl = `ws://127.0.0.1:${serverPort}${CDP_PAGE_PATH_PREFIX}${targetId}`;
    const sessionName = `quests-${subdomain}`;

    const { appCwd, env } = resolveCommandContext(appConfig, ctx);
    const resolvedArgs = resolvePathArgs(args, appConfig, ctx);
    const commandArgs = [
      "--cdp",
      cdpUrl,
      "--session",
      sessionName,
      ...resolvedArgs,
    ];

    const tmpDir = absolutePathJoin(appConfig.appDir, APP_FOLDER_NAMES.tmp);
    const screenshotDir = absolutePathJoin(tmpDir, "agent-browser-screenshots");
    const downloadPath = absolutePathJoin(tmpDir, "agent-browser-downloads");
    const screenshotDirRelative = path.relative(appCwd, screenshotDir);
    const downloadPathRelative = path.relative(appCwd, downloadPath);
    // just-bash sets HOME=/ which causes read-only FS errors when agent-browser
    // tries to write temp files. Use a writable dir under the workspace root,
    // shared across projects and isolated from app files.
    const homeDir = absolutePathJoin(
      appConfig.workspaceConfig.rootDir,
      "agent-browser-home",
    );

    const result = await execa(AGENT_BROWSER_PATH, commandArgs, {
      cancelSignal: ctx.signal,
      cwd: appCwd,
      env: {
        ...env,
        AGENT_BROWSER_DOWNLOAD_PATH: downloadPathRelative,
        AGENT_BROWSER_SCREENSHOT_DIR: screenshotDirRelative,
        AGENT_BROWSER_SOCKET_DIR: SOCKET_DIR,
        HOME: homeDir,
      },
      input: ctx.stdin || undefined,
      reject: false,
    });

    const combined = [result.stdout, result.stderr].filter(Boolean).join("\n");
    const truncated =
      combined.length > MAX_OUTPUT_LENGTH
        ? `... (truncated ${combined.length - MAX_OUTPUT_LENGTH} characters)\n` +
          combined.slice(combined.length - MAX_OUTPUT_LENGTH)
        : combined;

    return {
      exitCode: result.exitCode ?? 1,
      stderr: "",
      stdout: truncated,
    };
  });
}
