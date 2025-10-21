import { AI_GATEWAY_API_KEY_NOT_NEEDED } from "@quests/shared";

import { type AIGatewayProviderConfig } from "../../schemas/provider-config";

export function setProviderAuthHeaders(
  headers: Headers,
  config: Pick<AIGatewayProviderConfig.Type, "apiKey" | "type">,
) {
  if (config.apiKey === AI_GATEWAY_API_KEY_NOT_NEEDED) {
    return;
  }

  switch (config.type) {
    case "anthropic": {
      headers.set("x-api-key", config.apiKey);
      headers.set("anthropic-version", "2023-06-01");
      break;
    }
    case "google": {
      headers.set("x-goog-api-key", config.apiKey);
      break;
    }
    default: {
      headers.set("Authorization", `Bearer ${config.apiKey}`);
      break;
    }
  }
}
