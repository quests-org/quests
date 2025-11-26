import { client as apiClient } from "@/electron-main/api/client";
import { hasToken, isNetworkConnectionError } from "@/electron-main/api/utils";
import { logger as baseLogger } from "@/electron-main/lib/electron-logger";
import { createError } from "@/electron-main/lib/errors";
import { base } from "@/electron-main/rpc/base";
import { isFeatureEnabled } from "@/electron-main/stores/features";
import { getProviderConfigsStore } from "@/electron-main/stores/provider-configs";
import { safe } from "@orpc/server";
import { mergeGenerators } from "@quests/shared/merge-generators";
import { z } from "zod";

import { publisher } from "../publisher";

const logger = baseLogger.scope("rpc/user");

const hasAIProviderConfig = base.handler(() => {
  const providersStore = getProviderConfigsStore();
  const providerConfigs = providersStore.get("providers");
  const hasConfig = providerConfigs.length > 0;
  if (isFeatureEnabled("questsAccounts")) {
    return hasToken() || hasConfig;
  }
  return hasConfig;
});

const me = base
  .input(z.object({ cache: z.boolean().optional() }))
  .handler(async ({ context, input }) => {
    if (hasToken()) {
      if (input.cache && context.cache.user) {
        return {
          data: context.cache.user,
          error: null,
        };
      }

      context.cache.user = null;
      const [error, data] = await safe(apiClient.users.getMe());

      if (isNetworkConnectionError(error)) {
        logger.error("Network error getting authenticated user", {
          cause: error?.cause,
          error,
        });
        return {
          data: null,
          error: createError("SERVER_CONNECTION_ERROR"),
        };
      } else if (error) {
        logger.error("Error getting authenticated user", { error });
        return {
          data: null,
          error: createError(
            "UNKNOWN_IPC_ERROR",
            "There was an error getting your user information.",
          ),
        };
      } else {
        context.cache.user = data;
        return {
          data,
          error: null,
        };
      }
    }

    return {
      data: null,
      error: createError("NO_TOKEN"),
    };
  });

const live = {
  me: base.handler(async function* ({ context, signal }) {
    for await (const payload of publisher.subscribe("auth.updated", {
      signal,
    })) {
      context.cache.user = null;
      yield payload;
    }
  }),
  subscription: base
    .input(z.void().or(z.object({ noCache: z.boolean().optional() })))
    .handler(async function* ({ signal }) {
      const subscription = await getSubscription();
      yield subscription;

      const refetchSubscription = publisher.subscribe("subscription.refetch", {
        signal,
      });

      const updatedSubscription = publisher.subscribe("subscription.updated", {
        signal,
      });

      for await (const payload of mergeGenerators([
        updatedSubscription,
        refetchSubscription,
      ])) {
        if (payload) {
          yield payload;
        } else {
          const refetchedPayload = await getSubscription();
          yield refetchedPayload;
        }
      }
    }),
};

const subscription = base.handler(async () => {
  return await getSubscription();
});

const plans = base.handler(async () => {
  const [error, data] = await safe(apiClient.plans.get());

  if (isNetworkConnectionError(error)) {
    logger.error("Network error getting subscription plans", {
      cause: error?.cause,
      error,
    });
    return {
      data: null,
      error: createError("SERVER_CONNECTION_ERROR"),
    };
  } else if (error) {
    logger.error("Error getting subscription plans", { error });
    return {
      data: null,
      error: createError(
        "UNKNOWN_IPC_ERROR",
        "There was an error getting subscription plans.",
      ),
    };
  } else {
    return {
      data,
      error: null,
    };
  }
});

export async function getSubscription() {
  if (hasToken()) {
    const [error, data] = await safe(apiClient.users.getSubscriptionStatus());

    if (isNetworkConnectionError(error)) {
      logger.error("Network error getting subscription status", {
        cause: error?.cause,
        error,
      });
      return {
        data: null,
        error: createError("SERVER_CONNECTION_ERROR"),
      };
    } else if (error) {
      logger.error("Error getting subscription status", { error });
      return {
        data: null,
        error: createError(
          "UNKNOWN_IPC_ERROR",
          "There was an error getting your subscription status.",
        ),
      };
    } else {
      return {
        data,
        error: null,
      };
    }
  }

  return {
    data: null,
    error: createError("NO_TOKEN"),
  };
}

export const user = {
  hasAIProviderConfig,
  live,
  me,
  plans,
  subscription,
};
