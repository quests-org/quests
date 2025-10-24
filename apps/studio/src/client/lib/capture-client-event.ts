import {
  type AnalyticsEvents,
  type CaptureEventFunction,
} from "@quests/shared";

import { telemetry } from "./telemetry";

export const captureClientEvent: CaptureEventFunction = function <
  T extends keyof AnalyticsEvents,
>(
  type: T,
  ...rest: [AnalyticsEvents[T]] extends [never]
    ? []
    : [properties: AnalyticsEvents[T]]
) {
  if (!telemetry) {
    return;
  }

  telemetry.capture(type, rest[0]);
};
