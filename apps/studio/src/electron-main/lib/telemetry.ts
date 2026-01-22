import { PostHog } from "posthog-node";

import { logger } from "./electron-logger";

const API_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
const API_HOST = import.meta.env.VITE_POSTHOG_API_HOST;

const telemetry =
  !API_KEY || !API_HOST
    ? null
    : new PostHog(API_KEY, {
        enableExceptionAutocapture: true,
        host: API_HOST,
      });

if ((!API_KEY || !API_HOST) && import.meta.env.DEV) {
  logger.warn(
    "Analytics disabled due to missing VITE_POSTHOG_API_KEY or VITE_POSTHOG_API_HOST",
  );
}

export { telemetry };
