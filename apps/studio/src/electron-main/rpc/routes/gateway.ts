import { base } from "@/electron-main/rpc/base";
import { call, eventIterator } from "@orpc/server";
import {
  AIGatewayModel,
  fetchModelResultsForProviders,
} from "@quests/ai-gateway";
import { z } from "zod";

import { publisher } from "../publisher";

const ListSchema = z.object({
  errors: z.array(z.string()),
  models: z.array(AIGatewayModel.Schema),
});

const list = base
  .errors({
    FETCH_ERROR: {},
    PARSE_ERROR: {},
  })
  .output(ListSchema)
  .handler(async ({ context }) => {
    const providers = context.workspaceConfig.getAIProviders();
    const modelsForProviders = await fetchModelResultsForProviders(providers, {
      captureException: context.workspaceConfig.captureException,
    });

    const errors: string[] = [];
    const models: AIGatewayModel.Type[] = [];

    for (const modelResults of modelsForProviders) {
      if (modelResults.ok) {
        models.push(...modelResults.value);
      } else {
        errors.push(modelResults.error.message);
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

    for await (const _ of publisher.subscribe("store-provider.updated", {
      signal,
    })) {
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
