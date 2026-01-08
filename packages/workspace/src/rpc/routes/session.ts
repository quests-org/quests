import { call } from "@orpc/server";
import { mergeGenerators } from "@quests/shared/merge-generators";
import { z } from "zod";

import { createAppConfig } from "../../lib/app-config/create";
import { createSession } from "../../lib/create-session";
import { Store } from "../../lib/store";
import { Session } from "../../schemas/session";
import { StoreId } from "../../schemas/store-id";
import { AppSubdomainSchema } from "../../schemas/subdomains";
import { base, toORPCError } from "../base";
import { publisher } from "../publisher";

const byId = base
  .input(
    z.object({
      sessionId: StoreId.SessionSchema,
      subdomain: AppSubdomainSchema,
    }),
  )
  .output(Session.Schema)
  .handler(async ({ context, errors, input }) => {
    const { sessionId, subdomain } = input;
    const { workspaceConfig } = context;
    const appConfig = createAppConfig({
      subdomain,
      workspaceConfig,
    });
    const session = await Store.getSession(sessionId, appConfig);

    if (session.isErr()) {
      throw toORPCError(session.error, errors);
    }

    return session.value;
  });

const byIdWithMessagesAndParts = base
  .input(
    z.object({
      sessionId: StoreId.SessionSchema,
      subdomain: AppSubdomainSchema,
    }),
  )
  .output(Session.WithMessagesAndPartsSchema)
  .handler(async ({ context, errors, input }) => {
    const { sessionId, subdomain } = input;
    const { workspaceConfig } = context;
    const appConfig = createAppConfig({
      subdomain,
      workspaceConfig,
    });
    const session = await Store.getSessionWithMessagesAndParts(
      sessionId,
      appConfig,
    );

    if (session.isErr()) {
      throw toORPCError(session.error, errors);
    }

    return session.value;
  });

const list = base
  .input(z.object({ subdomain: AppSubdomainSchema }))
  .output(z.array(Session.Schema))
  .handler(async ({ context, errors, input }) => {
    const { subdomain } = input;
    const { workspaceConfig } = context;
    const appConfig = createAppConfig({
      subdomain,
      workspaceConfig,
    });
    const sessions = await Store.getSessions(appConfig);
    if (sessions.isErr()) {
      throw toORPCError(sessions.error, errors);
    }

    return sessions.value;
  });

const remove = base
  .input(
    z.object({
      sessionId: StoreId.SessionSchema,
      subdomain: AppSubdomainSchema,
    }),
  )
  .output(z.void())
  .handler(async ({ context, errors, input }) => {
    const { sessionId, subdomain } = input;
    const { workspaceConfig } = context;
    const appConfig = createAppConfig({
      subdomain,
      workspaceConfig,
    });
    const result = await Store.removeSession(sessionId, appConfig);
    if (result.isErr()) {
      context.workspaceConfig.captureException(result.error);
      throw toORPCError(result.error, errors);
    }

    context.workspaceConfig.captureEvent("session.removed");
  });

const create = base
  .input(z.object({ subdomain: AppSubdomainSchema }))
  .output(Session.Schema)
  .handler(async ({ context, errors, input }) => {
    const { subdomain } = input;
    const { workspaceConfig } = context;
    const appConfig = createAppConfig({
      subdomain,
      workspaceConfig,
    });
    const sessionResult = await createSession({ appConfig });

    if (sessionResult.isErr()) {
      context.workspaceConfig.captureException(sessionResult.error);
      throw toORPCError(sessionResult.error, errors);
    }

    return sessionResult.value;
  });

const stop = base
  .input(z.object({ subdomain: AppSubdomainSchema }))
  .handler(({ context, input }) => {
    context.workspaceRef.send({
      type: "stopSessions",
      value: {
        subdomain: input.subdomain,
      },
    });

    context.workspaceConfig.captureEvent("session.stopped");
  });

const live = {
  list: base
    .input(z.object({ subdomain: AppSubdomainSchema }))
    .handler(async function* ({ context, input, signal }) {
      yield call(list, input, { context, signal });

      const sessionUpdates = publisher.subscribe("session.updated", { signal });
      const sessionRemoved = publisher.subscribe("session.removed", { signal });

      async function* filterBySubdomain(
        generator: typeof sessionRemoved | typeof sessionUpdates,
      ) {
        for await (const payload of generator) {
          if (payload.subdomain === input.subdomain) {
            yield null;
          }
        }
      }

      for await (const _ of mergeGenerators([
        filterBySubdomain(sessionUpdates),
        filterBySubdomain(sessionRemoved),
      ])) {
        yield call(list, input, { context, signal });
      }
    }),
};

export const session = {
  byId,
  byIdWithMessagesAndParts,
  create,
  list,
  live,
  remove,
  stop,
};
