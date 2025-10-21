import { Result } from "typescript-result";

import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { fetchJson } from "../fetch-json";
import { parseOpenAICompatibleModels } from "../parse-openai-compatible-models";
import { getProviderMetadata } from "../providers/metadata";
import { openAICompatibleURL } from "../providers/openai-compatible-url";
import { setProviderAuthHeaders } from "../providers/set-auth-headers";

type MinimalProviderConfig = Pick<
  AIGatewayProviderConfig.Type,
  "apiKey" | "baseURL" | "type"
>;

export function fetchAndParseOpenAICompatibleModels(
  config: AIGatewayProviderConfig.Type,
) {
  return Result.gen(function* () {
    const data = yield* fetchOpenAICompatibleModels(config);

    return yield* parseOpenAICompatibleModels(data, config);
  });
}

export function fetchOpenAICompatibleModels(
  config: MinimalProviderConfig,
  { cache = false }: { cache?: boolean } = {},
) {
  const metadata = getProviderMetadata(config.type);
  const headers = new Headers({ "Content-Type": "application/json" });
  setProviderAuthHeaders(headers, config);

  return fetchJson({
    cache: cache || !metadata.api.defaultBaseURL.startsWith("http://localhost"),
    headers,
    url: openAICompatibleURL({ config, path: "/models" }),
  });
}
