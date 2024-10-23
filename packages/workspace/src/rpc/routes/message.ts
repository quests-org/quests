import { call, eventIterator } from "@orpc/server";
import { AIGatewayModel, fetchCheapAISDKModel } from "@quests/ai-gateway";
import { mergeGenerators } from "@quests/shared/merge-generators";
import { z } from "zod";

import { SessionMessage } from "../../client";
import { createAppConfig } from "../../lib/app-config/create";
import { setProjectState } from "../../lib/project-state-store";
import { Store } from "../../lib/store";
import { textForMessage } from "../../lib/text-for-message";
import { getWorkspaceServerURL } from "../../logic/server/url";
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
      const error = toORPCError(messages.error, errors);
      throw error;
    }

    return messages.value;
  });

const create = base
  .input(
    z.object({
      message: SessionMessage.UserSchemaWithParts,
      modelURI: AIGatewayModel.URISchema,
      sessionId: StoreId.SessionSchema,
      subdomain: AppSubdomainSchema,
    }),
  )
  .output(z.void())
  .handler(
    async ({
      context,
      errors,
      input: { message, modelURI, sessionId, subdomain },
    }) => {
      const [model, error] = (
        await context.modelRegistry.languageModel(
          modelURI,
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
        throw toORPCError(
          { message: error.message, type: "not-found" },
          errors,
        );
      }

      const appConfig = createAppConfig({
        subdomain,
        workspaceConfig: context.workspaceConfig,
      });

      await setProjectState(appConfig.appDir, {
        selectedModelURI: modelURI,
      });

      const cheapModelResult = await fetchCheapAISDKModel(
        modelURI,
        context.workspaceConfig.getAIProviders(),
        {
          captureException: context.workspaceConfig.captureException,
          workspaceServerURL: getWorkspaceServerURL(),
        },
      );
      const [cheapModel, cheapModelError] = cheapModelResult.toTuple();

      if (cheapModelError) {
        throw errors.NOT_FOUND({ message: cheapModelError.message });
      }

      context.workspaceRef.send({
        type: "addMessage",
        value: { cheapModel, message, model, sessionId, subdomain },
      });

      const messageText = textForMessage(message);

      context.workspaceConfig.captureEvent("message.created", {
        length: messageText.length,
        modelId: model.modelId,
        providerId: model.provider,
      });
    },
  );

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
      const partUpdates = publisher.subscribe("part.updated", { signal });

      async function* filterBySubdomain(generator: typeof messageUpdates) {
        for await (const payload of generator) {
          if (payload.subdomain === input.subdomain) {
            yield null;
          }
        }
      }

      for await (const _ of mergeGenerators([
        filterBySubdomain(messageUpdates),
        filterBySubdomain(partUpdates),
      ])) {
        yield call(listWithParts, input, { context, signal });
      }
    }),
};

export const message = {
  create,
  list: listWithParts,
  live,
};
