import { isEqual, pick } from "radashi";

import { type AIGatewayModel } from "../schemas/model";
import { AIGatewayModelURI } from "../schemas/model-uri";

export function findModelByString(
  modelString: string,
  models: AIGatewayModel.Type[],
): { exact: boolean; model: AIGatewayModel.Type | undefined } {
  const [parsedModel] = AIGatewayModelURI.parse(modelString).toTuple();

  if (parsedModel) {
    for (const model of models) {
      if (
        isEqual(pick(model, ["author", "canonicalId", "params"]), parsedModel)
      ) {
        return { exact: true, model };
      }
    }
  }

  for (const model of models) {
    if (model.canonicalId === modelString) {
      return { exact: false, model };
    }
  }

  for (const model of models) {
    if (model.providerId === modelString) {
      return { exact: false, model };
    }
  }

  return { exact: false, model: undefined };
}
