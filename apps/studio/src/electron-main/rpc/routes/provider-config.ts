import { base } from "@/electron-main/rpc/base";
import {
  StoreAIProviderConfigId,
  StoreAIProviderConfigSchema,
} from "@/shared/schemas/provider";
import { call, eventIterator } from "@orpc/server";
import {
  getAllProviderAdapters,
  getProviderAdapter,
  ProviderMetadataWithTypeSchema,
} from "@quests/ai-gateway";
import { safeStorage } from "electron";
import ms from "ms";
import { ulid } from "ulid";
import { z } from "zod";

import { getAppStateStore } from "../../stores/app-state";
import { getProviderConfigsStore } from "../../stores/provider-configs";
import { cacheMiddleware } from "../middleware/cache";
import { publisher } from "../publisher";

const ClientStudioAIProviderSchema = StoreAIProviderConfigSchema.omit({
  apiKey: true,
}).extend({
  maskedApiKey: z.string(),
});

const list = base.output(z.array(ClientStudioAIProviderSchema)).handler(() => {
  const providersStore = getProviderConfigsStore();
  return providersStore.get("providers").map(({ apiKey, ...provider }) => ({
    ...provider,
    maskedApiKey: apiKey
      ? `${apiKey.slice(0, 4)}${"·".repeat(28)}${apiKey.slice(-4)}`
      : "",
  }));
});

const remove = base
  .input(z.object({ id: StoreAIProviderConfigId }))
  .handler(({ context, errors, input }) => {
    const providersStore = getProviderConfigsStore();

    const providerConfig = providersStore
      .get("providers")
      .find((p) => p.id === input.id);

    if (!providerConfig) {
      throw errors.NOT_FOUND({ message: "Provider not found" });
    }

    providersStore.set(
      "providers",
      providersStore.get("providers").filter((p) => p.id !== input.id),
    );

    // Ensures environment variables inside the apps themselves are updated
    context.workspaceRef.send({ type: "restartAllRuntimes" });

    context.workspaceConfig.captureEvent("provider.removed", {
      provider_type: providerConfig.type,
    });
  });

const update = base
  .input(
    z.object({
      displayName: z.string().optional(),
      id: StoreAIProviderConfigId,
    }),
  )
  .handler(({ errors, input }) => {
    const providersStore = getProviderConfigsStore();
    const providerConfigs = providersStore.get("providers");

    const providerIndex = providerConfigs.findIndex((c) => c.id === input.id);

    if (providerIndex === -1) {
      throw errors.NOT_FOUND({ message: "Provider not found" });
    }

    const updatedConfigs = [...providerConfigs];
    const existingConfig = updatedConfigs[providerIndex];
    if (!existingConfig) {
      throw errors.NOT_FOUND({ message: "Provider config not found" });
    }
    updatedConfigs[providerIndex] = {
      ...existingConfig,
      displayName: input.displayName,
    };

    providersStore.set("providers", updatedConfigs);
  });

const create = base
  .input(
    StoreAIProviderConfigSchema.omit({
      cacheIdentifier: true,
      id: true,
    }).extend({
      skipValidation: z.boolean().optional(),
    }),
  )
  .handler(async ({ context, errors, input }) => {
    const { skipValidation, ...provider } = input;
    const providersStore = getProviderConfigsStore();
    const existingConfigs = providersStore.get("providers");

    const existingConfig = existingConfigs.find(
      (p) => p.type === provider.type,
    );
    if (existingConfig) {
      throw errors.UNAUTHORIZED({
        message:
          "A provider of this type already exists. Only one provider per type is allowed.",
      });
    }

    if (!skipValidation) {
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
    }

    const newProvider = {
      ...provider,
      cacheIdentifier: `quests.dev-${crypto.randomUUID()}`,
      id: StoreAIProviderConfigId.parse(ulid()),
    };

    providersStore.set("providers", [...existingConfigs, newProvider]);

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
        cacheTTL: ms("30 seconds"),
      },
    });
  })
  .use(cacheMiddleware)
  .errors({ FETCH_FAILED: {} })
  .input(z.object({ providerType: z.enum(["openrouter"]) }))
  .handler(async ({ errors, input }) => {
    const providersStore = getProviderConfigsStore();
    const providerConfig = providersStore
      .get("providers")
      .find((p) => p.type === input.providerType);

    if (!providerConfig) {
      throw errors.NOT_FOUND();
    }

    const adapter = getProviderAdapter(providerConfig.type);
    if (!adapter.fetchCredits) {
      throw errors.NOT_FOUND({
        message: "Provider does not support fetching credits",
      });
    }
    const result = await adapter.fetchCredits(providerConfig);
    if (!result.ok) {
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

      for await (const _ of publisher.subscribe("provider-config.updated", {
        signal,
      })) {
        yield call(list, {}, { context, signal });
      }
    }),
};

const safeStorageInfo = base
  .output(
    z.object({
      backend: z.string().nullable(),
      isAvailable: z.boolean(),
    }),
  )
  .handler(() => {
    const isAvailable = safeStorage.isEncryptionAvailable();
    const backend =
      process.platform === "linux"
        ? safeStorage.getSelectedStorageBackend()
        : null;

    return {
      backend,
      isAvailable,
    };
  });

const listMetadata = base
  .output(z.array(ProviderMetadataWithTypeSchema))
  .handler(() => {
    return getAllProviderAdapters().map((adapter) => ({
      ...adapter.metadata,
      type: adapter.providerType,
    }));
  });

const byTypeMetadata = base
  .input(z.object({ type: ProviderMetadataWithTypeSchema.shape.type }))
  .handler(({ input }) => {
    return getProviderAdapter(input.type).metadata;
  });

export const providerConfig = {
  create,
  credits,
  list,
  live,
  metadata: {
    byType: byTypeMetadata,
    list: listMetadata,
  },
  remove,
  safeStorageInfo,
  update,
};
