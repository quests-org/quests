import {
  type CaptureExceptionFunction,
  type ExceptionScope,
} from "@quests/shared";
import { app } from "electron";

import { getAppStateStore } from "../stores/app-state";
import { isDeveloperMode } from "../stores/preferences";
import { addServerException } from "./server-exceptions";
import { getSystemProperties } from "./system-properties";
import { telemetry } from "./telemetry";

export const captureServerException: CaptureExceptionFunction = function (
  error: unknown,
  additionalProperties?: {
    scopes?: ExceptionScope[];
  },
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
    scopes: ["studio", ...(additionalProperties?.scopes ?? [])],
    version: app.getVersion(),
    ...getSystemProperties(),
    ...(errorCode ? { error_code: errorCode } : {}),
    ...(errorData ? { error_data: errorData } : {}),
  };
  const appStateStore = getAppStateStore();
  const telemetryId = appStateStore.get("telemetryId");
  telemetry?.captureException(error, telemetryId, finalProperties);
  if (isDeveloperMode()) {
    /* eslint-disable no-console */
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const displayMessage = errorCode
      ? `[${errorCode}] ${errorMessage}`
      : errorMessage;

    console.groupCollapsed(`%c[Exception] ${displayMessage}`, "color: #b71c1c");

    if (error instanceof Error) {
      if (errorStack) {
        console.error(errorStack);
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
        console.error(error.cause);
        console.groupEnd();
      }
    } else {
      console.error(error);
    }

    // Log additional error data if present (e.g., validation issues)
    if (errorData) {
      console.groupCollapsed("%c▶︎ Error Data", "color: #ff9800");
      console.error(errorData);
      console.groupEnd();
    }

    console.groupEnd();

    addServerException({
      code: errorCode,
      message: errorMessage,
      stack: errorStack,
    });
    /* eslint-enable no-console */
  }
};
