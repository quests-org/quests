import { type AppUpdaterStatus } from "@/electron-main/lib/update";
import { type TabState } from "@/shared/tabs";
import { EventPublisher } from "@orpc/server";

export const publisher = new EventPublisher<{
  "auth.updated": {
    error?: {
      code: number;
    };
  };
  "debug.open-analytics-toolbar": null;
  "debug.open-debug-page": null;
  "debug.open-query-devtools": null;
  "debug.open-router-devtools": null;
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
  "updates.status": { status: AppUpdaterStatus };
  "updates.trigger-check": null;
  "window.focus-changed": null;
}>({
  maxBufferedEvents: 1, // Keep no history as we only need to know the latest state
});
