import { pnpmVersion } from "@/electron-main/lib/pnpm";
import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";
import { nativeImage } from "electron";
import openWith from "mac-open-with";
import os from "node:os";
import { z } from "zod";

const systemInfo = base.handler(async ({ context }) => {
  const pnpmVersionValue = await pnpmVersion();
  return [
    {
      title: "Node Version",
      value: process.version,
    },
    {
      title: "PNPM Version",
      value: pnpmVersionValue,
    },
    {
      title: "Workspace Root",
      value: context.workspaceConfig.rootDir,
    },
  ];
});

const throwError = base
  .input(
    z.object({
      type: z.enum(["known", "unknown"]),
    }),
  )
  .handler(({ errors, input }) => {
    const error =
      input.type === "known"
        ? errors.NOT_FOUND({ message: "This is a known error for testing" })
        : new Error("This is an uncaught error for testing");
    throw error;
  });

const getFileAssociations = base
  .input(
    z.object({
      extensions: z.array(z.string()),
    }),
  )
  .handler(async ({ input }) => {
    const platform = os.platform();

    if (platform !== "darwin") {
      return [];
    }

    const results = await Promise.all(
      input.extensions.map(async (ext) => {
        try {
          // Get apps that can open this extension using mac-open-with
          const apps = await openWith.getAppsThatOpenExtension(ext);

          if (apps.length === 0) {
            return {
              appIcon: null,
              appName: null,
              extension: ext,
            };
          }

          // Find the default app (isDefault: true)
          const defaultApp = apps.find((app) => app.isDefault) ?? apps[0];

          if (!defaultApp) {
            return {
              appIcon: null,
              appName: null,
              extension: ext,
            };
          }

          // Extract app name from URL (e.g., "file:///Applications/Safari.app/" -> "Safari")
          const appUrl = defaultApp.url;
          const appName =
            decodeURIComponent(appUrl)
              .split("/")
              .pop()
              ?.replace(/\.app\/?$/, "") ?? null;

          // The mac-open-with package already provides the icon as a base64 data URL
          const appIcon = defaultApp.icon || null;

          return {
            appIcon,
            appName,
            extension: ext,
          };
        } catch {
          return {
            appIcon: null,
            appName: null,
            extension: ext,
          };
        }
      }),
    );

    return results;
  });

const getSystemAppIcon = base
  .input(
    z.object({
      appPath: z.string(),
    }),
  )
  .handler(async ({ input }) => {
    const platform = os.platform();

    if (platform !== "darwin") {
      return null;
    }

    try {
      const icon = await nativeImage.createThumbnailFromPath(input.appPath, {
        height: 64,
        width: 64,
      });
      return icon.toDataURL();
    } catch {
      return null;
    }
  });

const live = {
  openAnalyticsToolbar: base.handler(async function* ({ signal }) {
    for await (const _payload of publisher.subscribe(
      "debug.open-analytics-toolbar",
      {
        signal,
      },
    )) {
      yield null;
    }
  }),
  openDebugPage: base.handler(async function* ({ signal }) {
    for await (const _payload of publisher.subscribe("debug.open-debug-page", {
      signal,
    })) {
      yield null;
    }
  }),
  openQueryDevtools: base.handler(async function* ({ signal }) {
    for await (const _payload of publisher.subscribe(
      "debug.open-query-devtools",
      {
        signal,
      },
    )) {
      yield null;
    }
  }),
  openRouterDevtools: base.handler(async function* ({ signal }) {
    for await (const _payload of publisher.subscribe(
      "debug.open-router-devtools",
      {
        signal,
      },
    )) {
      yield null;
    }
  }),
  testNotification: base.handler(async function* ({ signal }) {
    for await (const _payload of publisher.subscribe("test-notification", {
      signal,
    })) {
      yield {
        testNotification: true,
      };
    }
  }),
};

export const debug = {
  getFileAssociations,
  getSystemAppIcon,
  live,
  systemInfo,
  throwError,
};
