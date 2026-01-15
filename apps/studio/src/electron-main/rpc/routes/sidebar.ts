import { captureServerEvent } from "@/electron-main/lib/capture-server-event";
import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";
import {
  getSidebarVisible,
  setSidebarVisible,
} from "@/electron-main/stores/app-state";

const close = base.handler(() => {
  setSidebarVisible(false);
  captureServerEvent("app.sidebar_closed");
});

const open = base.handler(() => {
  setSidebarVisible(true);
  captureServerEvent("app.sidebar_opened");
});

const live = {
  state: base.handler(async function* ({ signal }) {
    yield { isOpen: getSidebarVisible() };

    for await (const payload of publisher.subscribe("sidebar.updated", {
      signal,
    })) {
      yield { isOpen: payload.isOpen };
    }
  }),
};

export const sidebar = {
  close,
  live,
  open,
};
