import { type TabState } from "@/shared/tabs";
import { type UpdateInfo } from "electron-updater";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type RendererHandlers = {
  navigateTo: (params: { route: string }) => void;
  tabsStoreChanged: (params: null | Readonly<TabState>) => void;
  testNotification: () => void;
  updateAvailable: (params: { updateInfo: UpdateInfo }) => void;
  updateCheckStarted: () => void;
  updateDownloaded: (params: { updateInfo: UpdateInfo }) => void;
  updateError: (params: { error: Error }) => void;
  updateNotAvailable: (params: { updateInfo: UpdateInfo }) => void;
};
