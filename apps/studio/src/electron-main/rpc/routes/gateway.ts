import { base } from "@/electron-main/rpc/base";
import { call, eventIterator } from "@orpc/server";
import {
  AIGatewayModel,
  AIGatewayProviderConfig,
  fetchModelResultsForProviders,
} from "@quests/ai-gateway";
import { mergeGenerators } from "@quests/shared/merge-generators";
import { z } from "zod";

import { publisher } from "../publisher";

const ListSchema = z.object({
  errors: z.array(
    z.object({
      config: AIGatewayProviderConfig.Schema.pick({
        displayName: true,
        type: true,
      }),
      message: z.string(),
    }),
  ),
  models: z.array(AIGatewayModel.Schema),
});

type ListErrors = z.output<typeof ListSchema>["errors"];

const list = base
  .errors({
    FETCH_ERROR: {},
    PARSE_ERROR: {},
  })
  .output(ListSchema)
  .handler(async ({ context }) => {
    const providers = context.workspaceConfig.getAIProviderConfigs();
    const modelsForProviders = await fetchModelResultsForProviders(providers, {
      captureException: context.workspaceConfig.captureException,
    });

    const errors: ListErrors = [];
    const models: AIGatewayModel.Type[] = [];

    for (const modelResults of modelsForProviders) {
      if (modelResults.ok) {
        models.push(...modelResults.value);
      } else {
        errors.push({
          config: modelResults.error.config,
          message: modelResults.error.message,
        });
      }
    }

    return { errors, models };
  });

const live = {
  list: base.output(eventIterator(ListSchema)).handler(async function* ({
    context,
    signal,
  }) {
    yield call(list, {}, { context, signal });

    const providerConfigUpdates = publisher.subscribe(
      "provider-config.updated",
      {
        signal,
      },
    );
    const apiBearerTokenUpdated = publisher.subscribe(
      "session.apiBearerToken.updated",
      { signal },
    );

    for await (const _ of mergeGenerators([
      providerConfigUpdates,
      apiBearerTokenUpdated,
    ])) {
      yield call(list, {}, { context, signal });
    }
  }),
};

const models = {
  list,
  live,
};

export const gateway = {
  models,
};
