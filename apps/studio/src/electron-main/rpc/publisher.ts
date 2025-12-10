import { type QueryKey } from "@/electron-main/api/client";
import { type AppUpdaterStatus } from "@/electron-main/lib/update";
import { type TabState } from "@/shared/tabs";
import { EventPublisher } from "@orpc/server";

export const publisher = new EventPublisher<{
  "app.reload": { webContentsId: number };
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
  "auth.updated": null;
  "cache.invalidated": {
    invalidatedQueryKeys?: QueryKey[];
  };
  "debug.open-analytics-toolbar": null;
  "debug.open-debug-page": null;
  "debug.open-query-devtools": null;
  "debug.open-router-devtools": null;
  "favorites.updated": null;
  "features.updated": null;
  "preferences.updated": null;
  "provider-config.updated": null;
  "server-exceptions.updated": null;
  "sidebar.visibility-updated": Partial<{
    visible: boolean;
  }>;
  "subscription.refetch": null;
  "tabs.updated": null | TabState;
  "test-notification": null;
  "updates.status": { status: AppUpdaterStatus };
  "updates.trigger-check": null;
  "window.focus-changed": null;
}>({
  maxBufferedEvents: 1, // Keep no history as we only need to know the latest state
});
