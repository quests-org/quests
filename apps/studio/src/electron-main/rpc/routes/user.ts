import { hasToken, isNetworkConnectionError } from "@/electron-main/api/utils";
import { logger as baseLogger } from "@/electron-main/lib/electron-logger";
import { createError } from "@/electron-main/lib/errors";
import { base } from "@/electron-main/rpc/base";
import { isFeatureEnabled } from "@/electron-main/stores/features";
import { getProvidersStore } from "@/electron-main/stores/providers";
import { call, safe } from "@orpc/server";
import { mergeGenerators } from "@quests/shared/merge-generators";
import { z } from "zod";

import { publisher } from "../publisher";
import { api } from "./api";

const logger = baseLogger.scope("rpc/user");

const credits = base.handler(async () => {
  if (hasToken()) {
    const [error, data] = await safe(call(api.users.getMyCredits, {}));
    return error ? null : data;
  }

  return null;
});

const hasAIProvider = base.handler(() => {
  const providersStore = getProvidersStore();
  const providers = providersStore.get("providers");
  const hasProvider = providers.length > 0;
  if (isFeatureEnabled("questsAccounts")) {
    return hasToken() || hasProvider;
  }
  return hasProvider;
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
      const [error, data] = await safe(call(api.users.getMe, {}));

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
  hasAIProvider: base.handler(async function* ({ context, signal }) {
    const providerUpdates = publisher.subscribe("store-provider.updated", {
      signal,
    });
    const userUpdates = publisher.subscribe("auth.updated", {
      signal,
    });

    yield call(hasAIProvider, {}, { context, signal });

    for await (const _ of mergeGenerators([providerUpdates, userUpdates])) {
      yield call(hasAIProvider, {}, { context, signal });
    }
  }),
  me: base.handler(async function* ({ context, signal }) {
    for await (const payload of publisher.subscribe("auth.updated", {
      signal,
    })) {
      context.cache.user = null;
      yield payload;
    }
  }),
};

export const user = {
  credits,
  hasAIProvider,
  live,
  me,
};
