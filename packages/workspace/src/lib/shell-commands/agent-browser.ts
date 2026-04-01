import { execa } from "execa";
import { defineCommand } from "just-bash";

import type { AppConfig } from "../app-config/types";

import { CDP_PAGE_PATH_PREFIX } from "../../logic/server/routes/cdp-bridge";
import { getWorkspaceServerPort } from "../../logic/server/url";
import { AGENT_BROWSER_PATH } from "../agent-browser";
import { isProjectSubdomain } from "../is-app";
import { resolveCommandContext, resolvePathArgs } from "./utils";

export const AGENT_BROWSER_COMMAND = {
  description:
    "Control a built-in browser to navigate the web, interact with pages, and extract content.",
  name: "agent-browser",
} as const;
const MAX_OUTPUT_LENGTH = 30_000;

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

    // FIXME this isn't enough. need to kill at boot too
    // Kill any stale daemon from a previous session. The daemon caches the CDP
    // WS URL it connected to, so if the app restarted the old daemon would be
    // connected to a dead WebSocket and ignore the --cdp flag on reconnect.
    await execa(AGENT_BROWSER_PATH, ["--session", sessionName, "close"], {
      reject: false,
    });

    const { appCwd } = resolveCommandContext(appConfig, ctx);
    const resolvedArgs = resolvePathArgs(args, appConfig, ctx);
    const commandArgs = [
      "--cdp",
      cdpUrl,
      "--session",
      sessionName,
      ...resolvedArgs,
    ];

    const result = await execa(AGENT_BROWSER_PATH, commandArgs, {
      cancelSignal: ctx.signal,
      cwd: appCwd,
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
