import { call, eventIterator } from "@orpc/server";
import { AIGatewayModelURI } from "@quests/ai-gateway";
import { mergeGenerators } from "@quests/shared/merge-generators";
import { z } from "zod";

import { AgentNameSchema } from "../../agents/types";
import { createAppConfig } from "../../lib/app-config/create";
import { createMessage } from "../../lib/create-message";
import { resolveModel } from "../../lib/resolve-model";
import { Store } from "../../lib/store";
import {
  appendFilesToMessage,
  UploadedFileSchema,
  writeUploadedFiles,
} from "../../lib/write-uploaded-files";
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
      agentName: AgentNameSchema,
      files: z.array(UploadedFileSchema).optional(),
      message: SessionMessage.UserSchemaWithParts,
      modelURI: AIGatewayModelURI.Schema,
      sessionId: StoreId.SessionSchema,
      subdomain: AppSubdomainSchema,
    }),
  )
  .output(z.void())
  .handler(
    async ({
      context,
      errors,
      input: { agentName, files, message, modelURI, sessionId, subdomain },
    }) => {
      const model = await resolveModel(modelURI, context, errors);

      const { appConfig } = await createMessage({
        filesCount: files?.length ?? 0,
        message,
        model,
        modelURI,
        subdomain,
        workspaceConfig: context.workspaceConfig,
      });

      let messageWithFiles = message;
      if (files && files.length > 0) {
        const uploadResult = await writeUploadedFiles(appConfig.appDir, files);
        messageWithFiles = appendFilesToMessage(message, uploadResult.paths);
      }

      context.workspaceRef.send({
        type: "addMessage",
        value: {
          agentName,
          message: messageWithFiles,
          model,
          sessionId,
          subdomain,
        },
      });

      if (appConfig.type === "project") {
        publisher.publish("project.updated", {
          subdomain: appConfig.subdomain,
        });
      }
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
