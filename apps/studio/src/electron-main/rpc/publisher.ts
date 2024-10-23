import { EventPublisher } from "@orpc/server";

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
}>({
  maxBufferedEvents: 1, // Keep no history as we only need to know the latest state
});
