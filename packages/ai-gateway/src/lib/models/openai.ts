import { Result } from "typescript-result";

import { type AIGatewayModel } from "../../schemas/model";
import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { fetchJson } from "../fetch-json";
import { parseOpenAICompatibleModels } from "../parse-openai-compatible-models";
import { apiURL } from "../providers/api-url";
import { setProviderAuthHeaders } from "../providers/set-auth-headers";

export function fetchModelsForOpenAI(config: AIGatewayProviderConfig.Type) {
  return Result.gen(function* () {
    const headers = new Headers({ "Content-Type": "application/json" });
    setProviderAuthHeaders(headers, config);

    const data = yield* fetchJson({
      cache: true,
      headers,
      url: apiURL({ config, path: "/models" }),
    });

    const baseModels = yield* parseOpenAICompatibleModels(data, config);

    return baseModels.map((model) => {
      const features: AIGatewayModel.ModelFeatures[] = [];

      if (
        model.providerId.startsWith("gpt-3.5") ||
        model.providerId.startsWith("gpt-4") ||
        model.providerId.startsWith("gpt-5") ||
        model.providerId.startsWith("o-")
      ) {
        features.push("inputText", "outputText", "tools");
      }

      const tags = [...model.tags];
      if (
        model.providerId.startsWith("gpt-3") ||
        model.providerId.startsWith("gpt-4-") ||
        model.providerId.startsWith("gpt-4o-") ||
        model.providerId.startsWith("o-")
      ) {
        tags.push("legacy");
      }

      return {
        ...model,
        features,
        tags,
      } satisfies AIGatewayModel.Type;
    });
  });
}
