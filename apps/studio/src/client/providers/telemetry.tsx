import type { ReactNode } from "react";

import { PostHogProvider } from "posthog-js/react";

import { telemetry } from "../lib/telemetry";

export function TelemetryProvider({ children }: { children: ReactNode }) {
  if (telemetry === null) {
    return <>{children}</>;
  }

  return <PostHogProvider client={telemetry}>{children}</PostHogProvider>;
}
