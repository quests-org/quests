import { Result } from "typescript-result";

import { type AIGatewayModel } from "../schemas/model";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { TypedError } from "./errors";
import { parseModelURI } from "./parse-model-uri";

export function providerConfigsForModelURI(
  modelURI: AIGatewayModel.URI,
  configs: AIGatewayProviderConfig.Type[],
) {
  return Result.gen(function* () {
    const providerType = yield* parseModelURI(modelURI).map((m) => m.provider);

    const modelConfigs = configs.find((p) => p.type === providerType);

    if (!modelConfigs) {
      return Result.error(
        new TypedError.NotFound(`Provider ${providerType} not found`),
      );
    }
    return modelConfigs;
  });
}
