import { type AIGatewayModel } from "@quests/ai-gateway/client";
import { fork, listify } from "radashi";

export interface GroupedModels {
  Legacy: AIGatewayModel.Type[];
  "May not support tools": AIGatewayModel.Type[];
  New: AIGatewayModel.Type[];
  Other: AIGatewayModel.Type[];
  Premium: AIGatewayModel.Type[];
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

export function groupAndFilterModels({
  hasPlan,
  models,
}: {
  hasPlan: boolean;
  models: AIGatewayModel.Type[];
}): GroupedModels {
  const shouldSeparatePremium = !hasPlan;

  const [recommended, notRecommended] = fork(
    models,
    (model) =>
      model.tags.includes("recommended") && model.tags.includes("coding"),
  );

  const [questsPremium, nonQuestsPremium] = shouldSeparatePremium
    ? fork(
        recommended,
        (model) =>
          model.params.provider === "quests" && model.tags.includes("premium"),
      )
    : [[], recommended];

  const [defaultRecommended, nonDefaultRecommended] = fork(
    nonQuestsPremium,
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
    Premium: prioritizeQuestsModels(questsPremium),
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

const QUESTS_AUTHOR = "quests";

function sortModelsByProviderAndName(
  models: AIGatewayModel.Type[],
): AIGatewayModel.Type[] {
  return models.toSorted((a, b) => {
    const authorA = a.author;
    const authorB = b.author;

    if (authorA !== authorB) {
      if (authorA === QUESTS_AUTHOR) {
        return -1;
      }
      if (authorB === QUESTS_AUTHOR) {
        return 1;
      }
    }

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

    // Keep Quests models in the order they are returned by the API
    if (authorA === QUESTS_AUTHOR && authorB === QUESTS_AUTHOR) {
      return 0;
    }

    return a.name.localeCompare(b.name);
  });
}
