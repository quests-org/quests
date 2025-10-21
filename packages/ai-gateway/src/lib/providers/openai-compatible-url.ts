import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { baseURLWithDefault } from "./base-url-with-default";

// Special cases here are for providers that have their own API that expects a
// different path than the OpenAI API compatible path or don't use a standard
// OpenAI API compatible path.
export function openAICompatibleURL({
  config,
  path,
}: {
  config: Pick<AIGatewayProviderConfig.Type, "baseURL" | "type">;
  path: `/${string}`;
}) {
  const baseURL = baseURLWithDefault(config);
  switch (config.type) {
    case "google": {
      return `${baseURL}/openai${path}`;
    }
    case "perplexity":
    case "z-ai": {
      return `${baseURL}${path}`;
    }
    default: {
      if (baseURL.endsWith("/v1")) {
        return `${baseURL}${path}`;
      }
      return `${baseURL}/v1${path}`;
    }
  }
}
