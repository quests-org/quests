import { type TabState } from "@/shared/tabs";
import { EventPublisher } from "@orpc/server";
import { type UpdateInfo } from "electron-updater";

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
  "updates.check-started": null;
  "updates.downloaded": { updateInfo: UpdateInfo };
  "updates.error": { error: { message: string } };
  "updates.not-available": { updateInfo: UpdateInfo };
}>({
  maxBufferedEvents: 1, // Keep no history as we only need to know the latest state
});
