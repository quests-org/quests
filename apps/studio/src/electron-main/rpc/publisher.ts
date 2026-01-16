import { type AppUpdaterStatus } from "@/electron-main/lib/update";
import { type TabState } from "@/shared/tabs";
import { EventPublisher } from "@orpc/server";

interface PublisherEvents {
  "app.reload": { webContentsId: number };
  "app.toggle-command-menu": { webContentsId: number };
  "auth.sign-in-error": {
    error: {
      code?: string | undefined;
      message?: string | undefined;
      status: number;
      statusText: string;
    };
  };
  "auth.sign-in-success": {
    success: true;
  };
  "debug.open-analytics-toolbar": null;
  "debug.open-debug-page": null;
  "debug.open-query-devtools": null;
  "debug.open-router-devtools": null;
  "favorites.updated": null;
  "features.updated": null;
  "preferences.updated": null;
  "provider-config.updated": null;
  "server-exception": {
    message: string;
    stack?: string;
  };
  "server-exceptions.updated": null;
  "session.apiBearerToken.updated": null;
  "sidebar.updated": {
    isOpen: boolean;
    width: number;
  };
  "tabs.updated": null | TabState;
  "test-notification": null;
  "updates.status": { status: AppUpdaterStatus };
  "updates.trigger-check": null;
  "window.focus-changed": null;
}

export const publisher = new EventPublisher<PublisherEvents>({
  maxBufferedEvents: 1, // Keep no history as we only need to know the latest state
});
