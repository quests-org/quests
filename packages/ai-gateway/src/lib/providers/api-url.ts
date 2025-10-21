import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { SlashPrefixedPathSchema } from "../../schemas/slash-prefixed-path";
import { baseURLWithDefault } from "./base-url-with-default";

// If needed, modifies the default base URL to point at the provider's own API
export function apiURL({
  config,
  path,
}: {
  config: Pick<AIGatewayProviderConfig.Type, "baseURL" | "type">;
  path: `/${string}`;
}) {
  const baseURL = baseURLWithDefault(config);
  switch (config.type) {
    case "anthropic": {
      // If missing a /v1, add it (Anthropic SDK expects no /v1 but AI SDK does)
      const finalPath = path.startsWith("/v1") ? path : `/v1${path}`;
      return `${baseURL}${finalPath}`;
    }
    case "google": {
      let adjustedPath = path;
      // Google's SDK adds a /v1beta prefix to the path, Vercel's SDK does not.
      if (path.startsWith("/v1beta")) {
        adjustedPath = SlashPrefixedPathSchema.parse(
          path.replace("/v1beta", ""),
        );
      }
      return `${baseURL}${adjustedPath}`;
    }
    case "ollama": {
      return `${baseURL}/api${path}`;
    }
    case "openai":
    case "openrouter": {
      return `${baseURL}/v1${path}`;
    }

    case "vercel": {
      return `${baseURL}/v1/ai${path}`;
    }

    default: {
      return `${baseURL}${path}`;
    }
  }
}
