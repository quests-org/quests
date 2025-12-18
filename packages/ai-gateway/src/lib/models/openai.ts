import { Result } from "typescript-result";

import { type AIGatewayModel } from "../../schemas/model";
import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { fetchJson } from "../fetch-json";
import { getModelFeatures } from "../get-model-features";
import { parseOpenAICompatibleModels } from "../parse-openai-compatible-models";
import { apiURL } from "../providers/api-url";
import { setProviderAuthHeaders } from "../providers/set-auth-headers";

type MinimalProviderConfig = Pick<
  AIGatewayProviderConfig.Type,
  "apiKey" | "baseURL" | "type"
>;

export function fetchAndParseOpenAIModels(
  config: AIGatewayProviderConfig.Type,
) {
  return Result.gen(function* () {
    const data = yield* fetchOpenAIModels(config);

    const baseModels = yield* parseOpenAICompatibleModels(data, config);

    return baseModels.map((model) => {
      const features = getModelFeatures(model.canonicalId);

      return {
        ...model,
        features,
      } satisfies AIGatewayModel.Type;
    });
  });
}

export function fetchOpenAIModels(
  config: MinimalProviderConfig,
  { cache = true }: { cache?: boolean } = {},
) {
  const headers = new Headers({ "Content-Type": "application/json" });
  setProviderAuthHeaders(headers, config);

  return fetchJson({
    cache,
    headers,
    url: apiURL({ config, path: "/models" }),
  });
}
