import {
  getSidebarVisible,
  setSidebarVisible,
} from "@/electron-main/lib/sidebar";
import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";

const close = base.handler(({ context }) => {
  setSidebarVisible({
    tabsManager: context.tabsManager,
    visible: false,
    workspaceConfig: context.workspaceConfig,
  });

  return true;
});

const open = base.handler(({ context }) => {
  setSidebarVisible({
    tabsManager: context.tabsManager,
    visible: true,
    workspaceConfig: context.workspaceConfig,
  });

  return true;
});

const live = {
  visibility: base.handler(async function* ({ signal }) {
    // Yield current state
    yield { visible: getSidebarVisible() };

    // Subscribe to changes
    for await (const payload of publisher.subscribe(
      "sidebar.visibility-updated",
      { signal },
    )) {
      yield payload;
    }
  }),
};

export const sidebar = {
  close,
  live,
  open,
};
