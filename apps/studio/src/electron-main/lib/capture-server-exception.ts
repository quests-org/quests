import { type CaptureExceptionFunction } from "@quests/shared";
import { app } from "electron";
import { unique } from "radashi";

import { getAppStateStore } from "../stores/app-state";
import { isDeveloperMode, isUsageMetricsEnabled } from "../stores/preferences";
import { logger } from "./electron-logger";
import { addServerException } from "./server-exceptions";
import { getSystemProperties } from "./system-properties";
import { telemetry } from "./telemetry";

export const captureServerException: CaptureExceptionFunction = function (
  error,
  additionalProperties,
) {
  const errorCode =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : undefined;

  // Extract additional error data from ORPC (e.g., validation issues from BAD_REQUEST)
  const errorData =
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data !== undefined
      ? error.data
      : undefined;

  const finalProperties = {
    ...additionalProperties,
    $process_person_profile: false, // Ensure anonymous, if at all
    scopes: unique(["studio", ...(additionalProperties?.scopes ?? [])]),
    version: app.getVersion(),
    ...getSystemProperties(),
    ...(errorCode ? { error_code: errorCode } : {}),
    ...(errorData ? { error_data: errorData } : {}),
    ...(additionalProperties?.rpc_path
      ? { rpc_path: additionalProperties.rpc_path.join(".") }
      : {}),
  };
  const appStateStore = getAppStateStore();
  const telemetryId = appStateStore.get("telemetryId");
  telemetry?.captureException(error, telemetryId, finalProperties);
  if (isDeveloperMode()) {
    /* eslint-disable no-console */
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const pathPrefix = additionalProperties?.rpc_path
      ? `[${additionalProperties.rpc_path.join(".")}] `
      : "";
    const displayMessage = errorCode
      ? `${pathPrefix}[${errorCode}] ${errorMessage}`
      : `${pathPrefix}${errorMessage}`;

    console.groupCollapsed(`%c[Exception] ${displayMessage}`, "color: #b71c1c");

    if (error instanceof Error) {
      if (errorStack) {
        logger.error(errorStack);
      }

      if (error.cause) {
        const causeMessage =
          error.cause instanceof Error
            ? error.cause.message
            : JSON.stringify(error.cause);
        console.groupCollapsed(
          "%c▶︎ Cause: " + causeMessage,
          "color: #f44336",
        );
        logger.error(error.cause);
        console.groupEnd();
      }
    } else {
      logger.error(error);
    }

    // Log additional error data if present (e.g., validation issues)
    if (errorData) {
      console.groupCollapsed("%c▶︎ Error Data", "color: #ff9800");
      logger.error(errorData);
      console.groupEnd();
    }

    console.groupEnd();

    addServerException({
      code: errorCode,
      message: errorMessage,
      stack: errorStack,
    });
    /* eslint-enable no-console */
  } else if (!isUsageMetricsEnabled()) {
    logger.error(error);
  }
};
