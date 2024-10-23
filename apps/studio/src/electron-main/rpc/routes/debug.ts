import { pnpmVersion } from "@/electron-main/lib/pnpm";
import { base } from "@/electron-main/rpc/base";

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

export const debug = {
  systemInfo,
};
