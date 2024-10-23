import { FAUX_STUDIO_URL } from "@quests/shared";
import { type CaptureResult, posthog } from "posthog-js";

import { vanillaRpcClient } from "../rpc/client";

type PropertyRedactionConfig = Record<string, RedactionStrategy>;

type RedactionStrategy =
  | { pattern: RegExp; replacement: string; type: "regex" }
  | { type: "delete" };

function redactProperties(
  properties: Record<string, unknown>,
  config: PropertyRedactionConfig,
): void {
  for (const [propertyName, strategy] of Object.entries(config)) {
    const value = properties[propertyName];

    if (value === undefined) {
      continue;
    }

    switch (strategy.type) {
      case "delete": {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete properties[propertyName];
        break;
      }
      case "regex": {
        if (typeof value === "string") {
          properties[propertyName] = value.replaceAll(
            strategy.pattern,
            strategy.replacement,
          );
        }
        break;
      }
    }
  }
}

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

  const { id: distinctID } = await vanillaRpcClient.telemetry.getId();
  const { version } = await vanillaRpcClient.preferences.getAppVersion();

  const telemetry = posthog.init(API_KEY, {
    api_host: API_HOST,
    autocapture: false, // Disable click tracking
    before_send: (event: CaptureResult | null): CaptureResult | null => {
      if (!event?.properties) {
        return event;
      }

      if (
        event.properties.$current_url &&
        typeof event.properties.$current_url === "string"
      ) {
        const convertedUrl = convertHashUrlToPath(
          event.properties.$current_url,
        );
        event.properties.$current_url = convertedUrl;

        // Also update pathname from the hash
        try {
          const parsed = new URL(convertedUrl);
          event.properties.$pathname = parsed.pathname;
        } catch {
          // If parsing fails, keep original pathname
        }
      }

      if (
        event.properties.$session_entry_url &&
        typeof event.properties.$session_entry_url === "string"
      ) {
        event.properties.$session_entry_url = convertHashUrlToPath(
          event.properties.$session_entry_url,
        );
      }

      redactProperties(event.properties, {
        // Remove page titles
        $title: { type: "delete" },
        title: { type: "delete" },

        // Redact project subdomains from URLs and paths
        $current_url: {
          pattern: /\/projects\/project-[a-z0-9]+/g,
          replacement: "/projects/:project_subdomain",
          type: "regex",
        },
        $pathname: {
          pattern: /\/projects\/project-[a-z0-9]+/g,
          replacement: "/projects/:project_subdomain",
          type: "regex",
        },
        $session_entry_url: {
          pattern: /\/projects\/project-[a-z0-9]+/g,
          replacement: "/projects/:project_subdomain",
          type: "regex",
        },
      });

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
    const subscription = await vanillaRpcClient.preferences.live.get();
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
