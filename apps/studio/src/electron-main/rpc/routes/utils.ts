import type {
  OpenAppInType,
  SupportedEditor,
  SupportedEditorId,
} from "@/shared/schemas/editors";

import { captureServerEvent } from "@/electron-main/lib/capture-server-event";
import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";
import {
  OpenAppInTypeSchema,
  SupportedEditorSchema,
} from "@/shared/schemas/editors";
import { ProjectSubdomainSchema } from "@quests/workspace/client";
import { createAppConfig } from "@quests/workspace/electron";
import { clipboard, shell, webContents } from "electron";
import { exec } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

interface EditorConfig {
  appName: string;
  id: SupportedEditorId;
  name: string;
}

const execAsync = promisify(exec);

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

const EDITORS_BY_PLATFORM: Record<string, EditorConfig[]> = {
  darwin: [
    { appName: "Cursor", id: "cursor", name: "Cursor" },
    { appName: "Visual Studio Code", id: "vscode", name: "VS Code" },
    { appName: "iTerm", id: "iterm", name: "iTerm" },
    { appName: "Terminal", id: "terminal", name: "Terminal" },
  ],
  linux: [
    { appName: "Cursor", id: "cursor", name: "Cursor" },
    { appName: "code", id: "vscode", name: "VS Code" },
    { appName: "gnome-terminal", id: "terminal", name: "Terminal" },
    { appName: "konsole", id: "terminal", name: "Konsole" },
    { appName: "xterm", id: "terminal", name: "XTerm" },
  ],
  win32: [
    { appName: "Cursor", id: "cursor", name: "Cursor" },
    { appName: "Visual Studio Code", id: "vscode", name: "VS Code" },
    { appName: "Windows Terminal", id: "terminal", name: "Windows Terminal" },
    { appName: "Command Prompt", id: "cmd", name: "Command Prompt" },
    { appName: "PowerShell", id: "powershell", name: "PowerShell" },
  ],
};

let supportedEditorsCache: null | SupportedEditor[] = null;

const DETECTION_COMMANDS = {
  darwin: (appName: string) => `open -Ra "${appName}"`,
  linux: (appName: string) => `which ${appName}`,
  win32: (appName: string) => `where "${appName}"`,
} as const;

const WINDOWS_COMMAND_MAP: Partial<Record<SupportedEditorId, string>> = {
  cmd: "cmd",
  cursor: "cursor",
  powershell: "powershell",
  terminal: "wt",
  vscode: "code",
};

const getDetectionCommand = (
  editor: EditorConfig,
  platform: string,
): string => {
  if (platform === "win32") {
    const command = WINDOWS_COMMAND_MAP[editor.id];
    if (command) {
      return `where ${command}`;
    }
  }

  const commandFn =
    DETECTION_COMMANDS[platform as keyof typeof DETECTION_COMMANDS];
  return commandFn(editor.appName);
};

const OPEN_COMMANDS = {
  darwin: (appName: string, appDir: string) =>
    `open -a "${appName}" "${appDir}"`,
  linux: (command: string, appDir: string) => `${command} "${appDir}"`,
  win32: (command: string, appDir: string) => `${command} "${appDir}"`,
} as const;

const APP_COMMAND_MAP: Partial<
  Record<SupportedEditorId, Record<string, string>>
> = {
  cursor: { darwin: "Cursor", linux: "cursor", win32: "cursor" },
  terminal: {
    darwin: "Terminal",
    linux: "gnome-terminal --working-directory",
    win32: "wt -d",
  },
  vscode: { darwin: "Visual Studio Code", linux: "code", win32: "code" },
};

const SPECIAL_COMMANDS: Partial<
  Record<SupportedEditorId, (appDir: string, platform: string) => string>
> = {
  cmd: (appDir: string, platform: string) => {
    if (platform !== "win32") {
      throw new Error("Command Prompt is only available on Windows");
    }
    return `cmd /c "cd /d "${appDir}" && cmd"`;
  },
  iterm: (appDir: string, platform: string) => {
    if (platform !== "darwin") {
      throw new Error("iTerm is only available on macOS");
    }
    return `open -a "iTerm" "${appDir}"`;
  },
  powershell: (appDir: string, platform: string) => {
    if (platform !== "win32") {
      throw new Error("PowerShell is only available on Windows");
    }
    return `powershell -NoExit -Command "Set-Location '${appDir}'"`;
  },
};

const getOpenCommand = (
  type: OpenAppInType,
  appDir: string,
  platform: string,
): string => {
  if (type === "show-in-folder") {
    throw new Error("show-in-folder should be handled separately");
  }

  const specialCommand = SPECIAL_COMMANDS[type];
  if (specialCommand) {
    return specialCommand(appDir, platform);
  }

  const appCommands = APP_COMMAND_MAP[type];
  if (!appCommands) {
    throw new Error(`Unknown app type: ${type}`);
  }

  const command = appCommands[platform];
  if (!command) {
    throw new Error(`${type} is not supported on ${platform}`);
  }

  const commandFn = OPEN_COMMANDS[platform as keyof typeof OPEN_COMMANDS];
  return commandFn(command, appDir);
};

const checkEditorAvailability = async (
  editor: EditorConfig,
): Promise<SupportedEditor> => {
  const platform = os.platform();

  try {
    const command = getDetectionCommand(editor, platform);
    await execAsync(command);
    return { available: true, id: editor.id, name: editor.name };
  } catch {
    return { available: false, id: editor.id, name: editor.name };
  }
};

const initializeSupportedEditorsCache = async () => {
  if (supportedEditorsCache !== null) {
    return supportedEditorsCache;
  }

  const platform = os.platform();
  const editors = EDITORS_BY_PLATFORM[platform] ?? [];

  const supportedEditors = await Promise.all(
    editors.map(checkEditorAvailability),
  );

  supportedEditorsCache = supportedEditors;
  return supportedEditors;
};

const openExternalLink = base
  .errors({
    INVALID_PROTOCOL: {
      message: "Invalid protocol",
    },
  })
  .output(z.undefined())
  .input(z.object({ url: z.url() }))
  .handler(async ({ errors, input }) => {
    const url = new URL(input.url);
    if (!SAFE_PROTOCOLS.has(url.protocol)) {
      throw errors.INVALID_PROTOCOL();
    }
    await shell.openExternal(input.url);
  });

const imageDataURI = base
  .input(z.object({ filePath: z.string() }))
  .handler(async ({ input }) => {
    try {
      const fileBuffer = await fs.readFile(input.filePath);
      const base64 = fileBuffer.toString("base64");

      // Determine MIME type based on file extension
      const ext = path.extname(input.filePath).toLowerCase();
      const mimeType = ext === ".svg" ? "image/svg+xml" : "image/png";

      return `data:${mimeType};base64,${base64}`;
    } catch {
      return null;
    }
  });

const openAppIn = base
  .errors({
    ERROR_OPENING_APP: {
      message: "Error opening app",
    },
  })
  .input(
    z.object({
      subdomain: ProjectSubdomainSchema,
      type: OpenAppInTypeSchema,
    }),
  )
  .handler(async ({ context, errors, input }) => {
    const snapshot = context.workspaceRef.getSnapshot();
    const appConfig = createAppConfig({
      subdomain: input.subdomain,
      workspaceConfig: snapshot.context.config,
    });

    const platform = os.platform();

    try {
      if (input.type === "show-in-folder") {
        shell.showItemInFolder(appConfig.appDir);
      } else {
        const command = getOpenCommand(input.type, appConfig.appDir, platform);
        await execAsync(command);
      }

      captureServerEvent("app.opened_in", {
        app_id: input.type,
      });
    } catch (error) {
      throw errors.ERROR_OPENING_APP({
        message: error instanceof Error ? error.message : undefined,
      });
    }
  });

const takeScreenshot = base
  .errors({
    SCREENSHOT_FAILED: {
      message: "Failed to take screenshot",
    },
  })
  .input(
    z.object({
      bounds: z
        .object({
          height: z.number(),
          width: z.number(),
          x: z.number(),
          y: z.number(),
        })
        .optional(),
      subdomain: ProjectSubdomainSchema,
    }),
  )
  .output(
    z.object({
      filename: z.string(),
      filepath: z.string(),
    }),
  )
  .handler(async ({ context, errors, input }) => {
    try {
      const webContent = webContents.fromId(context.webContentsId);
      if (!webContent) {
        throw errors.SCREENSHOT_FAILED({ message: "Web contents not found" });
      }

      const image = input.bounds
        ? await webContent.capturePage({
            height: Math.round(input.bounds.height),
            width: Math.round(input.bounds.width),
            x: Math.round(input.bounds.x),
            y: Math.round(input.bounds.y),
          })
        : await webContent.capturePage();

      const buffer = image.toPNG();

      const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
      const filename = `${input.subdomain}-screenshot-${timestamp}.png`;
      const downloadsPath = path.join(os.homedir(), "Downloads");
      const filepath = path.join(downloadsPath, filename);

      await fs.writeFile(filepath, buffer);

      return { filename, filepath };
    } catch (error) {
      throw errors.SCREENSHOT_FAILED({
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

const copyScreenshotToClipboard = base
  .errors({
    SCREENSHOT_FAILED: {
      message: "Failed to take screenshot",
    },
  })
  .input(
    z.object({
      bounds: z
        .object({
          height: z.number(),
          width: z.number(),
          x: z.number(),
          y: z.number(),
        })
        .optional(),
      subdomain: ProjectSubdomainSchema,
    }),
  )
  .handler(async ({ context, errors, input }) => {
    try {
      const webContent = webContents.fromId(context.webContentsId);
      if (!webContent) {
        throw errors.SCREENSHOT_FAILED({ message: "Web contents not found" });
      }

      const image = input.bounds
        ? await webContent.capturePage({
            height: Math.round(input.bounds.height),
            width: Math.round(input.bounds.width),
            x: Math.round(input.bounds.x),
            y: Math.round(input.bounds.y),
          })
        : await webContent.capturePage();

      clipboard.writeImage(image);
    } catch (error) {
      throw errors.SCREENSHOT_FAILED({
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

const showFileInFolder = base
  .errors({
    FILE_NOT_FOUND: {
      message: "File not found",
    },
  })
  .input(
    z.object({
      filepath: z.string(),
    }),
  )
  .handler(async ({ errors, input }) => {
    try {
      await fs.access(input.filepath);
      shell.showItemInFolder(input.filepath);
    } catch {
      throw errors.FILE_NOT_FOUND();
    }
  });

const getSupportedEditors = base
  .output(z.array(SupportedEditorSchema))
  .handler(async () => {
    if (supportedEditorsCache !== null) {
      return supportedEditorsCache;
    }

    return await initializeSupportedEditorsCache();
  });

const live = {
  reload: base.handler(async function* ({ signal }) {
    for await (const _payload of publisher.subscribe("app.reload", {
      signal,
    })) {
      yield null;
    }
  }),
  serverExceptions: base.handler(async function* ({ signal }) {
    for await (const payload of publisher.subscribe("server-exception", {
      signal,
    })) {
      yield payload;
    }
  }),
};

export const utils = {
  copyScreenshotToClipboard,
  getSupportedEditors,
  imageDataURI,
  live,
  openAppIn,
  openExternalLink,
  showFileInFolder,
  takeScreenshot,
};
