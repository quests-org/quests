import { type TabState } from "@/shared/tabs";
import { EventPublisher } from "@orpc/server";
import { type ProgressInfo, type UpdateInfo } from "electron-updater";

export const publisher = new EventPublisher<{
  "auth.updated": {
    error?: {
      code: number;
    };
  };
  "favorites.updated": null;
  "menu.height-updated": Partial<{
    height: number;
  }>;
  "preferences.updated": null;
  "server-exception": {
    message: string;
    stack?: string;
  };
  "sidebar.visibility-updated": Partial<{
    visible: boolean;
  }>;
  "store-provider.updated": null;
  "tabs.updated": null | TabState;
  "test-notification": null;
  "updates.available": { updateInfo: UpdateInfo };
  "updates.cancelled": { updateInfo: UpdateInfo };
  "updates.check-started": null;
  "updates.download-progress": { progress: ProgressInfo };
  "updates.downloaded": { updateInfo: UpdateInfo };
  "updates.error": { error: { message: string } };
  "updates.not-available": { updateInfo: UpdateInfo };
  "updates.start-check": null;
  "window.focus-changed": null;
}>({
  maxBufferedEvents: 1, // Keep no history as we only need to know the latest state
});
