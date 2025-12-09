import {
  type CaptureExceptionFunction,
  type ExceptionScope,
} from "@quests/shared";
import { app } from "electron";

import { getAppStateStore } from "../stores/app-state";
import { addServerException } from "./server-exceptions";
import { getSystemProperties } from "./system-properties";
import { telemetry } from "./telemetry";

export const captureServerException: CaptureExceptionFunction = function (
  error: unknown,
  additionalProperties?: {
    scopes?: ExceptionScope[];
  },
) {
  const finalProperties = {
    ...additionalProperties,
    $process_person_profile: false, // Ensure anonymous, if at all
    scopes: ["studio", ...(additionalProperties?.scopes ?? [])],
    version: app.getVersion(),
    ...getSystemProperties(),
  };
  const appStateStore = getAppStateStore();
  const telemetryId = appStateStore.get("telemetryId");
  telemetry?.captureException(error, telemetryId, finalProperties);
  if (import.meta.env.DEV) {
    /* eslint-disable no-console */
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.groupCollapsed(`%c[Exception] ${errorMessage}`, "color: #b71c1c");

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

    console.groupEnd();

    addServerException({
      message: errorMessage,
      stack: errorStack,
    });
    /* eslint-enable no-console */
  }
};
