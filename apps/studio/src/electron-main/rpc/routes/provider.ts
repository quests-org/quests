import { base } from "@/electron-main/rpc/base";
import {
  StoreAIProviderId,
  StoreAIProviderSchema,
} from "@/shared/schemas/provider";
import { call, eventIterator } from "@orpc/server";
import { fetchCredits, getProviderAdapter } from "@quests/ai-gateway";
import { ulid } from "ulid";
import { z } from "zod";

import { getAppStateStore } from "../../stores/app-state";
import { getProvidersStore } from "../../stores/providers";
import { cacheMiddleware } from "../middleware/cache";
import { publisher } from "../publisher";

const ClientStudioAIProviderSchema = StoreAIProviderSchema.omit({
  apiKey: true,
}).extend({
  maskedApiKey: z.string(),
});

const list = base.output(z.array(ClientStudioAIProviderSchema)).handler(() => {
  const providersStore = getProvidersStore();
  return providersStore.get("providers").map(({ apiKey, ...provider }) => ({
    ...provider,
    maskedApiKey: apiKey
      ? `${apiKey.slice(0, 4)}${"·".repeat(28)}${apiKey.slice(-4)}`
      : "",
  }));
});

const remove = base
  .input(z.object({ id: StoreAIProviderId }))
  .handler(({ context, errors, input }) => {
    const providersStore = getProvidersStore();

    const provider = providersStore
      .get("providers")
      .find((p) => p.id === input.id);

    if (!provider) {
      throw errors.NOT_FOUND({ message: "Provider not found" });
    }

    providersStore.set(
      "providers",
      providersStore.get("providers").filter((p) => p.id !== input.id),
    );

    // Ensures environment variables inside the apps themselves are updated
    context.workspaceRef.send({ type: "restartAllRuntimes" });

    context.workspaceConfig.captureEvent("provider.removed", {
      provider_type: provider.type,
    });
  });

const create = base
  .input(StoreAIProviderSchema.omit({ cacheIdentifier: true, id: true }))
  .handler(async ({ context, errors, input: provider }) => {
    const providersStore = getProvidersStore();
    const existingProviders = providersStore.get("providers");

    // Check if a provider of this type already exists
    const existingProvider = existingProviders.find(
      (p) => p.type === provider.type,
    );
    if (existingProvider) {
      throw errors.UNAUTHORIZED({
        message:
          "A provider of this type already exists. Only one provider per type is allowed.",
      });
    }

    const adapter = getProviderAdapter(provider.type);

    const result = await adapter.verifyAPIKey({
      apiKey: provider.apiKey,
      baseURL: provider.baseURL,
    });

    if (!result.ok) {
      context.workspaceConfig.captureEvent("provider.verification_failed", {
        provider_type: provider.type,
      });

      throw errors.UNAUTHORIZED({
        cause: result.error,
        message: result.error.message,
      });
    }

    const newProvider = {
      ...provider,
      cacheIdentifier: `quests.dev-${crypto.randomUUID()}`,
      id: StoreAIProviderId.parse(ulid()),
    };

    providersStore.set("providers", [...existingProviders, newProvider]);

    const appStateStore = getAppStateStore();
    appStateStore.set("hasCompletedProviderSetup", true);

    // Ensures environment variables inside the apps themselves are updated
    context.workspaceRef.send({ type: "restartAllRuntimes" });

    context.workspaceConfig.captureEvent("provider.created", {
      provider_type: provider.type,
    });
  });

const credits = base
  .use(async ({ next }) => {
    return next({
      context: {
        cacheTTL: 30 * 1000,
      },
    });
  })
  .use(cacheMiddleware)
  .errors({ FETCH_FAILED: {} })
  .input(z.object({ provider: z.enum(["openrouter"]) }))
  .handler(async ({ errors }) => {
    const providersStore = getProvidersStore();
    const provider = providersStore
      .get("providers")
      .find((p) => p.type === "openrouter");

    if (!provider) {
      throw errors.NOT_FOUND();
    }

    const result = await fetchCredits(provider);
    if (!result.ok) {
      if (result.error.type === "gateway-not-found-error") {
        throw errors.NOT_FOUND({ message: result.error.message });
      }
      throw errors.FETCH_FAILED({ message: result.error.message });
    }

    return {
      credits: result.value,
    };
  });

const live = {
  list: base
    .output(eventIterator(z.array(ClientStudioAIProviderSchema)))
    .handler(async function* ({ context, signal }) {
      yield call(list, {}, { context, signal });

      for await (const _ of publisher.subscribe("store-provider.updated", {
        signal,
      })) {
        yield call(list, {}, { context, signal });
      }
    }),
};

export const provider = {
  create,
  credits,
  list,
  live,
  remove,
};
