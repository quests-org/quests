import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";
import { ProjectSubdomainSchema } from "@quests/workspace/client";
import { createAppConfig } from "@quests/workspace/electron";
import { shell } from "electron";
import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

const execAsync = promisify(exec);

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

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
      type: z.enum(["cursor", "show-in-folder", "terminal", "vscode"]),
    }),
  )
  .handler(async ({ context, errors, input }) => {
    const snapshot = context.workspaceRef.getSnapshot();
    const appConfig = createAppConfig({
      subdomain: input.subdomain,
      workspaceConfig: snapshot.context.config,
    });

    try {
      switch (input.type) {
        case "cursor": {
          await execAsync(`open -a "Cursor" "${appConfig.appDir}"`);
          break;
        }
        case "show-in-folder": {
          shell.showItemInFolder(appConfig.appDir);
          break;
        }
        case "terminal": {
          await execAsync(`open -a "Terminal" "${appConfig.appDir}"`);
          break;
        }
        case "vscode": {
          await execAsync(`code "${appConfig.appDir}"`);
          break;
        }
      }
    } catch (error) {
      throw errors.ERROR_OPENING_APP({
        message: error instanceof Error ? error.message : undefined,
      });
    }
  });

const live = {
  serverExceptions: base.handler(async function* ({ signal }) {
    for await (const payload of publisher.subscribe("server-exception", {
      signal,
    })) {
      yield payload;
    }
  }),
};

export const utils = {
  imageDataURI,
  live,
  openAppIn,
  openExternalLink,
};
