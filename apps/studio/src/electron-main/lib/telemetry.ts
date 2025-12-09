import { PostHog } from "posthog-node";
import { z } from "zod";

import { logger } from "./electron-logger";
import { addServerException } from "./server-exceptions";

const API_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
const API_HOST = import.meta.env.VITE_POSTHOG_API_HOST;

const telemetry =
  !API_KEY || !API_HOST
    ? null
    : new PostHog(API_KEY, {
        enableExceptionAutocapture: true,
        host: API_HOST,
      });

const CaptureSchema = z.looseObject({
  event: z.string(),
});

telemetry?.on("capture", (payload) => {
  const parsed = CaptureSchema.safeParse(payload);
  if (!parsed.success) {
    return;
  }
  const { event } = parsed.data;
  if (event === "$exception") {
    // eslint-disable-next-line no-console
    console.groupCollapsed("[Telemetry] Exception captured");
    logger.error(JSON.stringify(payload, null, 2));
    // eslint-disable-next-line no-console
    console.groupEnd();
  }
});

if (!API_KEY || !API_HOST) {
  logger.warn(
    "Analytics disabled due to missing VITE_POSTHOG_API_KEY or VITE_POSTHOG_API_HOST",
  );

  // Setup global error handling for dev if no telemetry is enabled
  if (import.meta.env.DEV) {
    const handleError = (error: unknown) => {
      // eslint-disable-next-line no-console
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      addServerException({ message: errorMessage, stack: errorStack });
    };

    process.on("uncaughtException", handleError);
    process.on("unhandledRejection", handleError);
  }
}

export { telemetry };
