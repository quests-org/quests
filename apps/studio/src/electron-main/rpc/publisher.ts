import { type RPCError } from "@/electron-main/lib/errors";
import { type AppUpdaterStatus } from "@/electron-main/lib/update";
import { type getSubscription } from "@/electron-main/rpc/routes/user";
import { type TabState } from "@/shared/tabs";
import { EventPublisher } from "@orpc/server";

export const publisher = new EventPublisher<{
  "app.reload": { webContentsId: number };
  "auth.updated": {
    error?: null | RPCError;
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
  "sidebar.visibility-updated": Partial<{
    visible: boolean;
  }>;
  "subscription.refetch": null;
  "subscription.updated": Awaited<ReturnType<typeof getSubscription>>;
  "tabs.updated": null | TabState;
  "test-notification": null;
  "updates.status": { status: AppUpdaterStatus };
  "updates.trigger-check": null;
  "window.focus-changed": null;
}>({
  maxBufferedEvents: 1, // Keep no history as we only need to know the latest state
});
