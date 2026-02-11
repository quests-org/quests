import { call, eventIterator } from "@orpc/server";
import { AIGatewayModelURI, fetchModel } from "@quests/ai-gateway";
import { mergeGenerators } from "@quests/shared/merge-generators";
import { z } from "zod";

import { createAppConfig } from "../../lib/app-config/create";
import { createSession } from "../../lib/create-session";
import { newMessage } from "../../lib/new-message";
import { Store } from "../../lib/store";
import { FileUpload } from "../../schemas/file-upload";
import { SessionMessage } from "../../schemas/session/message";
import { StoreId } from "../../schemas/store-id";
import { AppSubdomainSchema } from "../../schemas/subdomains";
import { base, toORPCError } from "../base";
import { publisher } from "../publisher";

const listWithParts = base
  .input(
    z.object({
      sessionId: StoreId.SessionSchema,
      subdomain: AppSubdomainSchema,
    }),
  )
  .output(z.array(SessionMessage.WithPartsSchema))
  .handler(async ({ context, errors, input }) => {
    const { sessionId, subdomain } = input;
    const { workspaceConfig } = context;
    const appConfig = createAppConfig({
      subdomain,
      workspaceConfig,
    });
    const messages = await Store.getMessagesWithParts({
      appConfig,
      sessionId,
    });

    if (messages.isErr()) {
      throw toORPCError(messages.error, errors);
    }

    return messages.value;
  });

const create = base
  .input(
    z.object({
      files: z.array(FileUpload.Schema).optional(),
      folders: z.array(z.object({ path: z.string() })).optional(),
      modelURI: AIGatewayModelURI.Schema,
      prompt: z.string(),
      sessionId: StoreId.SessionSchema.optional(),
      subdomain: AppSubdomainSchema,
    }),
  )
  .output(z.object({ sessionId: StoreId.SessionSchema }))
  .handler(
    async ({
      context,
      errors,
      input: { files, folders, modelURI, prompt, sessionId, subdomain },
    }) => {
      const appConfig = createAppConfig({
        subdomain,
        workspaceConfig: context.workspaceConfig,
      });

      const modelResult = await fetchModel({
        captureException: context.workspaceConfig.captureException,
        configs: context.workspaceConfig.getAIProviderConfigs(),
        modelURI,
      });

      if (!modelResult.ok) {
        const error = modelResult.error;
        context.workspaceConfig.captureException(error);
        throw toORPCError(error, errors);
      }

      const model = modelResult.value;

      let finalSessionId: StoreId.Session;
      if (sessionId) {
        finalSessionId = sessionId;
      } else {
        const sessionResult = await createSession({ appConfig });
        if (sessionResult.isErr()) {
          context.workspaceConfig.captureException(sessionResult.error);
          throw toORPCError(sessionResult.error, errors);
        }
        finalSessionId = sessionResult.value.id;
      }

      const messageResult = await newMessage({
        appConfig,
        files,
        folders,
        model,
        modelURI,
        prompt,
        sessionId: finalSessionId,
      });

      if (messageResult.isErr()) {
        context.workspaceConfig.captureException(messageResult.error);
        throw toORPCError(messageResult.error, errors);
      }

      const message = messageResult.value;
      context.workspaceRef.send({
        type: "addMessage",
        value: {
          agentName: "main",
          message,
          model,
          sessionId: message.metadata.sessionId,
          subdomain,
        },
      });

      if (appConfig.type === "project") {
        publisher.publish("project.updated", {
          subdomain: appConfig.subdomain,
        });
      }

      return { sessionId: message.metadata.sessionId };
    },
  );

const count = base
  .input(
    z.object({
      sessionId: StoreId.SessionSchema.optional(),
      subdomain: AppSubdomainSchema,
    }),
  )
  .output(z.number())
  .handler(async ({ context, errors, input }) => {
    const { sessionId, subdomain } = input;
    const { workspaceConfig } = context;
    const appConfig = createAppConfig({
      subdomain,
      workspaceConfig,
    });

    const messageIds = sessionId
      ? await Store.getMessageIds(sessionId, appConfig)
      : await Store.getAllMessageIds(appConfig);

    if (messageIds.isErr()) {
      const error = toORPCError(messageIds.error, errors);
      throw error;
    }

    return messageIds.value.length;
  });

const live = {
  listWithParts: base
    .input(
      z.object({
        sessionId: StoreId.SessionSchema,
        subdomain: AppSubdomainSchema,
      }),
    )
    .output(eventIterator(SessionMessage.WithPartsSchema.array()))
    .handler(async function* ({ context, input, signal }) {
      yield call(listWithParts, input, { context, signal });

      const messageUpdates = publisher.subscribe("message.updated", { signal });
      const messageRemoved = publisher.subscribe("message.removed", { signal });
      const partUpdates = publisher.subscribe("part.updated", { signal });

      async function* filterBySubdomain(
        generator:
          | typeof messageRemoved
          | typeof messageUpdates
          | typeof partUpdates,
      ) {
        for await (const payload of generator) {
          if (payload.subdomain === input.subdomain) {
            yield null;
          }
        }
      }

      for await (const _ of mergeGenerators([
        filterBySubdomain(messageUpdates),
        filterBySubdomain(messageRemoved),
        filterBySubdomain(partUpdates),
      ])) {
        yield call(listWithParts, input, { context, signal });
      }
    }),
};

export const message = {
  count,
  create,
  list: listWithParts,
  live,
};
