import { type AIGatewayModel } from "@quests/ai-gateway/client";
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
    Recommended: prioritizeQuestsModels([
      ...defaultRecommended,
      ...nonDefaultRecommended,
    ]),
    New: prioritizeQuestsModels(newModels),
    Other: prioritizeQuestsModels(notLegacy),
    Legacy: prioritizeQuestsModels(legacy),
    "May not support tools": prioritizeQuestsModels(doesNotSupportTools),
  };
  /* eslint-enable perfectionist/sort-objects */

  return result;
}

function prioritizeQuestsModels(
  models: AIGatewayModel.Type[],
): AIGatewayModel.Type[] {
  return sortModelsByProviderAndName(models);
}

function sortModelsByProviderAndName(
  models: AIGatewayModel.Type[],
): AIGatewayModel.Type[] {
  return models.toSorted((a, b) => {
    const providerA = a.params.provider;
    const providerB = b.params.provider;

    if (providerA !== providerB) {
      if (providerA === "quests") {
        return -1;
      }
      if (providerB === "quests") {
        return 1;
      }

      return providerA.localeCompare(providerB);
    }

    return a.name.localeCompare(b.name);
  });
}
