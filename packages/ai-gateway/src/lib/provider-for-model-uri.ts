import { Result } from "typescript-result";

import { type AIGatewayModel } from "../schemas/model";
import { type AIGatewayProvider } from "../schemas/provider";
import { TypedError } from "./errors";
import { parseModelURI } from "./parse-model-uri";

export function providerForModelURI(
  modelURI: AIGatewayModel.URI,
  providers: AIGatewayProvider.Type[],
) {
  return Result.gen(function* () {
    const providerType = yield* parseModelURI(modelURI).map((m) => m.provider);

    const modelProvider = providers.find((p) => p.type === providerType);

    if (!modelProvider) {
      return Result.error(
        new TypedError.NotFound(`Provider ${providerType} not found`),
      );
    }
    return modelProvider;
  });
}
