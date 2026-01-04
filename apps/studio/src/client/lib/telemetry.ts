import { FAUX_STUDIO_URL } from "@quests/shared";
import { type CaptureResult, posthog } from "posthog-js";

import { rpcClient } from "../rpc/client";

const API_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
const API_HOST = import.meta.env.VITE_POSTHOG_API_HOST;

function convertHashUrlToPath(url: string): string {
  try {
    const parsed = new URL(url);
    let resultUrl = url;

    if (parsed.hash) {
      const hashPath = parsed.hash.slice(1); // Remove the leading #
      resultUrl = `${parsed.protocol}//${parsed.host}${hashPath}`;
    }

    // When built Electron will show the file:// protocol in the URL
    if (resultUrl.startsWith("file://")) {
      resultUrl = resultUrl.replace("file://", FAUX_STUDIO_URL);
    }

    return resultUrl;
  } catch {
    return url;
  }
}

async function initTelemetry() {
  if (!API_KEY || !API_HOST) {
    return null;
  }

  const { id: distinctID } = await rpcClient.telemetry.getId.call();
  const { version } = await rpcClient.preferences.getAppVersion.call();

  const telemetry = posthog.init(API_KEY, {
    api_host: API_HOST,
    autocapture: false, // Disable click tracking
    before_send: (event: CaptureResult | null): CaptureResult | null => {
      if (!event?.properties) {
        return event;
      }

      const { properties } = event;

      if (typeof properties.$current_url === "string") {
        const convertedUrl = convertHashUrlToPath(properties.$current_url);
        properties.$current_url = convertedUrl;

        // Also update pathname from the hash
        try {
          const parsed = new URL(convertedUrl);
          properties.$pathname = parsed.pathname;
        } catch {
          // If parsing fails, keep original pathname
        }
      }

      if (typeof properties.$session_entry_url === "string") {
        properties.$session_entry_url = convertHashUrlToPath(
          properties.$session_entry_url,
        );
      }

      if (
        typeof properties.$pathname === "string" &&
        properties.$pathname.startsWith("/projects/")
      ) {
        delete properties.$title;
        delete properties.title;
      }

      return event;
    },
    bootstrap: { distinctID },
    capture_exceptions: true,
    capture_heatmaps: false,
    capture_pageview: false, // Capturing manually so we can filter out ignored paths
    capture_performance: false,
    debug: import.meta.env.VITE_DEBUG_TELEMETRY === "true",
    defaults: "2025-05-24",
    person_profiles: "never",
  });

  // Sends version with every event
  telemetry.register({ version });

  async function handleUsageMetricsUpdates() {
    const subscription = await rpcClient.preferences.live.get.call();
    for await (const { enableUsageMetrics } of subscription) {
      if (enableUsageMetrics) {
        if (telemetry.has_opted_out_capturing()) {
          telemetry.opt_in_capturing();
        }
      } else {
        telemetry.opt_out_capturing();
      }
    }
  }

  // We don't want to delay app boot for this

  void handleUsageMetricsUpdates();
  return telemetry;
}

const telemetry = await initTelemetry();

export { telemetry };
