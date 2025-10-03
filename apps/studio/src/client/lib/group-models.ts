import { type AIGatewayModel } from "@quests/ai-gateway";
import { fork, listify } from "radashi";

export interface GroupedModels {
  Legacy: AIGatewayModel.Type[];
  "May not support tools": AIGatewayModel.Type[];
  New: AIGatewayModel.Type[];
  Other: AIGatewayModel.Type[];
  Recommended: AIGatewayModel.Type[];
}

type GroupedModelsEntry = {
  [K in keyof GroupedModels]: [K, GroupedModels[K]];
}[keyof GroupedModels];

export function getGroupedModelsEntries(
  grouped: GroupedModels,
): GroupedModelsEntry[] {
  return listify(grouped, (key, value) => [key, value]);
}

export function groupAndFilterModels(
  models: AIGatewayModel.Type[],
): GroupedModels {
  const [recommended, notRecommended] = fork(
    models,
    (model) =>
      model.tags.includes("recommended") && model.tags.includes("coding"),
  );

  const [defaultRecommended, nonDefaultRecommended] = fork(
    recommended,
    (model) => model.tags.includes("default"),
  );

  const [supportsTools, doesNotSupportTools] = fork(notRecommended, (model) =>
    model.features.includes("tools"),
  );

  const [newModels, notNewModels] = fork(supportsTools, (model) =>
    model.tags.includes("new"),
  );

  const [legacy, notLegacy] = fork(notNewModels, (model) =>
    model.tags.includes("legacy"),
  );

  /* eslint-disable perfectionist/sort-objects */
  const result: GroupedModels = {
    Recommended: [...defaultRecommended, ...nonDefaultRecommended],
    New: newModels,
    Other: notLegacy,
    Legacy: legacy,
    "May not support tools": doesNotSupportTools,
  };
  /* eslint-enable perfectionist/sort-objects */

  return result;
}
