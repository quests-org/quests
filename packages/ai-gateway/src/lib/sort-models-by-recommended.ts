import { alphabetical, fork } from "radashi";

import { type AIGatewayModel } from "../schemas/model";

export function sortModelsByRecommended(models: AIGatewayModel.Type[]) {
  const [defaultModels, nonDefaultModels] = fork(models, (model) =>
    model.tags.includes("default"),
  );

  const [defaultRecommended, defaultOther] = fork(defaultModels, (model) =>
    model.tags.includes("recommended"),
  );

  const [recommended, other] = fork(nonDefaultModels, (model) =>
    model.tags.includes("recommended"),
  );

  return [
    ...alphabetical(defaultRecommended, (model) => model.canonicalId),
    ...alphabetical(defaultOther, (model) => model.canonicalId),
    ...alphabetical(recommended, (model) => model.canonicalId),
    ...alphabetical(other, (model) => model.canonicalId),
  ];
}
