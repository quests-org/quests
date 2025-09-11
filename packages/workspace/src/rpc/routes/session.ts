import { call } from "@orpc/server";
import { AIGatewayModel } from "@quests/ai-gateway";
import { z } from "zod";

import { createAppConfig } from "../../lib/app-config/create";
import { generateSessionTitle } from "../../lib/generate-session-title";
import { Store } from "../../lib/store";
import { getWorkspaceServerURL } from "../../logic/server/url";
import { Session } from "../../schemas/session";
import { SessionMessage } from "../../schemas/session/message";
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
    const title = await generateSessionTitle(appConfig);
    const sessionId = StoreId.newSessionId();
    const sessionResult = await Store.saveSession(
      {
        createdAt: new Date(),
        id: sessionId,
        title,
      },
      appConfig,
    );
    if (sessionResult.isErr()) {
      throw toORPCError(sessionResult.error, errors);
    }

    context.workspaceConfig.captureEvent("session.created");

    return sessionResult.value;
  });

const createWithMessage = base
  .input(
    z.object({
      message: SessionMessage.UserSchemaWithParts,
      modelURI: AIGatewayModel.URISchema,
      sessionId: StoreId.SessionSchema,
      subdomain: AppSubdomainSchema,
    }),
  )
  .handler(async ({ context, errors, input }) => {
    const [model, error] = (
      await context.modelRegistry.languageModel(
        input.modelURI,
        context.workspaceConfig.getAIProviders(),
        {
          captureException: context.workspaceConfig.captureException,
          workspaceServerURL: getWorkspaceServerURL(),
        },
      )
    )
      // eslint-disable-next-line unicorn/no-await-expression-member
      .toTuple();

    if (error) {
      throw toORPCError(error, errors);
    }

    context.workspaceRef.send({
      type: "createSession",
      value: {
        message: input.message,
        model,
        sessionId: input.sessionId,
        subdomain: input.subdomain,
      },
    });
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

      for await (const payload of sessionUpdates) {
        if (payload.subdomain === input.subdomain) {
          yield call(list, input, { context, signal });
        }
      }
    }),
};

export const session = {
  byId,
  byIdWithMessagesAndParts,
  create,
  createWithMessage,
  list,
  live,
  remove,
  stop,
};
