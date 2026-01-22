import { pnpmVersion } from "@/electron-main/lib/pnpm";
import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";
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
  live,
  systemInfo,
  throwError,
};
