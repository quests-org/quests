import { pnpmVersion } from "@/electron-main/lib/pnpm";
import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";

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

const live = {
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
};
