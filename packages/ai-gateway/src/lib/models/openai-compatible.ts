import { Result } from "typescript-result";

import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { fetchJson } from "../fetch-json";
import { parseOpenAICompatibleModels } from "../parse-openai-compatible-models";
import { getProviderMetadata } from "../providers/metadata";
import { openAICompatibleURL } from "../providers/openai-compatible-url";
import { setProviderAuthHeaders } from "../providers/set-auth-headers";

export function fetchModelsForOpenAICompatible(
  config: AIGatewayProviderConfig.Type,
) {
  return Result.gen(function* () {
    const metadata = getProviderMetadata(config.type);
    const headers = new Headers({ "Content-Type": "application/json" });
    setProviderAuthHeaders(headers, config);

    const data = yield* fetchJson({
      cache: !metadata.api.defaultBaseURL.startsWith("http://localhost"),
      headers,
      url: openAICompatibleURL({ config, path: "/models" }),
    });

    return yield* parseOpenAICompatibleModels(data, config);
  });
}
