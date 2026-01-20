import { setDefaultModel } from "@/electron-main/lib/set-default-model";
import { base } from "@/electron-main/rpc/base";
import { ClientAIProviderConfigSchema } from "@/shared/schemas/provider";
import { call, eventIterator } from "@orpc/server";
import {
  AIGatewayProviderConfig,
  baseURLWithDefault,
  fetchCredits,
  getAllProviderMetadata,
  getProviderMetadata,
  ProviderMetadataSchema,
  verifyAPIKey,
} from "@quests/ai-gateway";
import { AIProviderConfigIdSchema } from "@quests/shared";
import { safeStorage } from "electron";
import ms from "ms";
import { ulid } from "ulid";
import { z } from "zod";

import { getAppStateStore } from "../../stores/app-state";
import { getProviderConfigsStore } from "../../stores/provider-configs";
import { cacheMiddleware } from "../middleware/cache";
import { publisher } from "../publisher";

const list = base.output(z.array(ClientAIProviderConfigSchema)).handler(() => {
  const providersStore = getProviderConfigsStore();
  return providersStore.get("providers").map(({ apiKey, ...provider }) => ({
    ...provider,
    maskedApiKey: apiKey
      ? `${apiKey.slice(0, 4)}${"·".repeat(28)}${apiKey.slice(-4)}`
      : "",
  }));
});

const remove = base
  .input(z.object({ id: AIProviderConfigIdSchema }))
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
      id: AIProviderConfigIdSchema,
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
  .errors({ BAD_REQUEST: {} })
  .input(
    z.object({
      config: AIGatewayProviderConfig.Schema.omit({
        cacheIdentifier: true,
        id: true,
      }),
      skipValidation: z.boolean().optional(),
    }),
  )
  .handler(
    async ({
      context,
      errors,
      input: { config: newConfig, skipValidation },
    }) => {
      const providersStore = getProviderConfigsStore();
      const existingConfigs = providersStore.get("providers");

      const duplicateProviderByName = existingConfigs.find(
        (p) =>
          p.type === newConfig.type && p.displayName === newConfig.displayName,
      );

      if (duplicateProviderByName) {
        throw errors.BAD_REQUEST({
          message: `A provider of type "${newConfig.type}" with the name "${newConfig.displayName ?? ""}" already exists`,
        });
      }

      const providerMetadata = getProviderMetadata(newConfig.type);
      const requiresAPIKey = providerMetadata.requiresAPIKey ?? true;

      if (!requiresAPIKey) {
        const newConfigBaseURL = baseURLWithDefault(newConfig);
        const duplicateProviderByBaseURL = existingConfigs.find((p) => {
          const existingBaseURL = baseURLWithDefault(p);
          return (
            p.type === newConfig.type && existingBaseURL === newConfigBaseURL
          );
        });

        if (duplicateProviderByBaseURL) {
          throw errors.BAD_REQUEST({
            message: `A provider of type "${providerMetadata.name}" with the base URL "${newConfigBaseURL}" already exists.`,
          });
        }
      }

      if (!skipValidation) {
        const result = await verifyAPIKey(newConfig);

        if (!result.ok) {
          context.workspaceConfig.captureEvent("provider.verification_failed", {
            provider_type: newConfig.type,
          });

          throw errors.UNAUTHORIZED({
            cause: result.error,
            message: result.error.message,
          });
        }
      }

      const configToSave = {
        ...newConfig,
        cacheIdentifier: `quests.dev-${crypto.randomUUID()}`,
        id: AIProviderConfigIdSchema.parse(ulid()),
      };

      providersStore.set("providers", [...existingConfigs, configToSave]);

      const appStateStore = getAppStateStore();
      appStateStore.set("hasCompletedProviderSetup", true);

      void setDefaultModel({ onlyIfUnset: true });
      // Ensures environment variables inside the apps themselves are updated
      context.workspaceRef.send({ type: "restartAllRuntimes" });

      context.workspaceConfig.captureEvent("provider.created", {
        provider_type: configToSave.type,
      });
    },
  );

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
  .input(z.object({ id: AIProviderConfigIdSchema }))
  .output(
    z.object({
      credits: z.object({ total_credits: z.number(), total_usage: z.number() }),
    }),
  )
  .handler(async ({ errors, input }) => {
    const providersStore = getProviderConfigsStore();
    const providerConfig = providersStore
      .get("providers")
      .find((p) => p.id === input.id);

    if (!providerConfig) {
      throw errors.NOT_FOUND();
    }

    const result = await fetchCredits(providerConfig);
    if (!result.ok) {
      throw errors.FETCH_FAILED({ message: result.error.message });
    }

    return {
      credits: result.value,
    };
  });

const live = {
  list: base
    .output(eventIterator(z.array(ClientAIProviderConfigSchema)))
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
  .output(z.array(ProviderMetadataSchema))
  .handler(() => {
    return getAllProviderMetadata();
  });

export const providerConfig = {
  create,
  credits,
  list,
  live,
  metadata: {
    list: listMetadata,
  },
  remove,
  safeStorageInfo,
  update,
};
