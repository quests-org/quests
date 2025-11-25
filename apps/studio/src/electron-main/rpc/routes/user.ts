import { client as apiClient } from "@/electron-main/api/client";
import { hasToken, isNetworkConnectionError } from "@/electron-main/api/utils";
import { logger as baseLogger } from "@/electron-main/lib/electron-logger";
import { createError } from "@/electron-main/lib/errors";
import { base } from "@/electron-main/rpc/base";
import { type Outputs } from "@/electron-main/rpc/context";
import { isFeatureEnabled } from "@/electron-main/stores/features";
import { getProviderConfigsStore } from "@/electron-main/stores/provider-configs";
import { safe } from "@orpc/server";
import { z } from "zod";

import { publisher } from "../publisher";

const logger = baseLogger.scope("rpc/user");

let subscriptionCache: null | {
  data: Outputs["users"]["getSubscriptionStatus"];
  error: null;
} = null;

// eslint-disable-next-line unicorn/prefer-top-level-await
void (async function subscribeToAuthUpdates() {
  for await (const _payload of publisher.subscribe("auth.updated", {})) {
    logger.info("Auth updated, refetching subscription status");
    subscriptionCache = null;
    const updatedSubscription = await getSubscription(true);
    if (updatedSubscription.data) {
      subscriptionCache = updatedSubscription;
    }
    publisher.publish("subscription.updated", {
      subscription: updatedSubscription.data,
    });
  }
})();

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
  subscription: base.handler(async function* ({ signal }) {
    const subscription = await getSubscription();
    if (subscription.data) {
      subscriptionCache = subscription;
    }
    yield subscription;

    for await (const payload of publisher.subscribe("subscription.updated", {
      signal,
    })) {
      yield {
        data: payload.subscription,
        error: null,
      };
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

async function getSubscription(noCache = false) {
  if (hasToken()) {
    if (subscriptionCache && !noCache) {
      return subscriptionCache;
    }

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
