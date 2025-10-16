import { call, eventIterator } from "@orpc/server";
import { AIGatewayModel, parseModelURI } from "@quests/ai-gateway";
import {
  DEFAULT_THEME_GRADIENT,
  SelectableAppIconsSchema,
  THEMES,
} from "@quests/shared/icons";
import { mergeGenerators } from "@quests/shared/merge-generators";
import { draw } from "radashi";
import { z } from "zod";

import { createAppConfig } from "../../../lib/app-config/create";
import { newProjectConfig } from "../../../lib/app-config/new";
import { createProject } from "../../../lib/create-project";
import { createProjectFromPreview } from "../../../lib/create-project-from-preview";
import { duplicateProject } from "../../../lib/duplicate-project";
import { generateProjectTitleAndIcon } from "../../../lib/generate-project-title-and-icon";
import { getApp, getProjects } from "../../../lib/get-apps";
import { getRegistryTemplateDetails } from "../../../lib/get-registry-template-details";
import { getWorkspaceAppForSubdomain } from "../../../lib/get-workspace-app-for-subdomain";
import { setProjectState } from "../../../lib/project-state-store";
import { updateQuestManifest } from "../../../lib/quest-manifest";
import { trashProject } from "../../../lib/trash-project";
import { getWorkspaceServerURL } from "../../../logic/server/url";
import { WorkspaceAppProjectSchema } from "../../../schemas/app";
import { SessionMessage } from "../../../schemas/session/message";
import { StoreId } from "../../../schemas/store-id";
import {
  PreviewSubdomainSchema,
  ProjectSubdomainSchema,
} from "../../../schemas/subdomains";
import { base, toORPCError } from "../../base";
import { publisher } from "../../publisher";
import { projectGit } from "./git";
import { projectQuestConfig } from "./quest-manifest";
import { projectState } from "./state";
import { projectVersion } from "./version";

const bySubdomain = base
  .input(z.object({ subdomain: ProjectSubdomainSchema }))
  .output(WorkspaceAppProjectSchema)
  .handler(async ({ context, errors, input }) => {
    const result = await getApp(input.subdomain, context.workspaceConfig);
    if (result.isErr()) {
      throw toORPCError(result.error, errors);
    }

    return result.value;
  });

const bySubdomains = base
  .input(z.object({ subdomains: ProjectSubdomainSchema.array() }))
  .output(
    z
      .discriminatedUnion("ok", [
        z.object({
          data: WorkspaceAppProjectSchema,
          ok: z.literal(true),
        }),
        z.object({
          error: z.object({ type: z.literal("not-found") }),
          ok: z.literal(false),
          subdomain: ProjectSubdomainSchema,
        }),
      ])
      .array(),
  )
  .handler(async ({ context, errors, input }) => {
    const results = [];
    for (const subdomain of input.subdomains) {
      const result = await getApp(subdomain, context.workspaceConfig);
      if (result.isErr()) {
        if (result.error.type === "workspace-not-found-error") {
          results.push({
            error: { type: "not-found" as const },
            ok: false as const,
            subdomain,
          });
          continue;
        }
        throw toORPCError(result.error, errors);
      }
      results.push({
        data: result.value,
        ok: true as const,
      });
    }
    return results;
  });

const ProjectsWithTotalSchema = z.object({
  projects: WorkspaceAppProjectSchema.array(),
  total: z.number(),
});

const ListInputSchema = z
  .object({
    direction: z.enum(["asc", "desc"]).optional(),
    limit: z.number().optional(),
    sortBy: z.enum(["createdAt", "updatedAt"]).optional(),
  })
  .default({
    direction: "desc",
    sortBy: "updatedAt",
  });

const list = base
  .input(ListInputSchema)
  .output(ProjectsWithTotalSchema)
  .handler(async ({ context, input }) => {
    return getProjects(context.workspaceConfig, input);
  });

const create = base
  .input(
    z.object({
      message: SessionMessage.UserSchemaWithParts,
      modelURI: AIGatewayModel.URISchema,
      previewSubdomain: PreviewSubdomainSchema.optional(),
      sessionId: StoreId.SessionSchema,
    }),
  )
  .output(WorkspaceAppProjectSchema)
  .handler(
    async ({
      context,
      errors,
      input: { message, modelURI, previewSubdomain, sessionId },
      signal,
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
        context.workspaceConfig.captureException(error);
        throw toORPCError(error, errors);
      }

      const projectConfig = await newProjectConfig({
        workspaceConfig: context.workspaceConfig,
      });

      const result = previewSubdomain
        ? await createProjectFromPreview(
            {
              previewConfig: createAppConfig({
                subdomain: previewSubdomain,
                workspaceConfig: context.workspaceConfig,
              }),
              sessionId,
              workspaceConfig: context.workspaceConfig,
            },
            { signal },
          )
        : await createProject(
            {
              projectConfig,
              workspaceConfig: context.workspaceConfig,
            },
            { signal },
          );

      if (result.isErr()) {
        context.workspaceConfig.captureException(result.error);
        throw toORPCError(result.error, errors);
      }

      await setProjectState(result.value.projectConfig.appDir, {
        selectedModelURI: modelURI,
      });

      let templateTitle: string | undefined;
      if (previewSubdomain) {
        const { folderName } = createAppConfig({
          subdomain: previewSubdomain,
          workspaceConfig: context.workspaceConfig,
        });
        const templateDetails = await getRegistryTemplateDetails(
          folderName,
          context.workspaceConfig,
        );
        templateTitle = templateDetails?.title;
      }

      // Not awaiting promise here because we want to return the project immediately
      generateProjectTitleAndIcon({
        message,
        model,
        onUpdate: () => {
          publisher.publish("project.updated", {
            subdomain: result.value.projectConfig.subdomain,
          });
        },
        projectSubdomain: result.value.projectConfig.subdomain,
        templateTitle,
        workspaceConfig: context.workspaceConfig,
      }).catch(context.workspaceConfig.captureException);

      publisher.publish("project.updated", {
        subdomain: result.value.projectConfig.subdomain,
      });

      context.workspaceRef.send({
        type: "createSession",
        value: {
          message,
          model,
          sessionId,
          subdomain: result.value.projectConfig.subdomain,
        },
      });

      const workspaceApp = await getWorkspaceAppForSubdomain(
        result.value.projectConfig.subdomain,
        context.workspaceConfig,
      );

      context.workspaceConfig.captureEvent(
        previewSubdomain ? "project.created_from_preview" : "project.created",
        {
          modelId: model.modelId,
          ...(previewSubdomain && {
            preview_folder_name: createAppConfig({
              subdomain: previewSubdomain,
              workspaceConfig: context.workspaceConfig,
            }).folderName,
          }),
          providerId: model.provider,
        },
      );

      return workspaceApp;
    },
  );

const createFromEval = base
  .input(
    z.object({
      evalName: z.string(),
      iconName: SelectableAppIconsSchema,
      modelURI: AIGatewayModel.URISchema,
      sessionId: StoreId.SessionSchema,
      systemPrompt: z.string().optional(),
      userPrompt: z.string(),
    }),
  )
  .output(WorkspaceAppProjectSchema)
  .handler(
    async ({
      context,
      errors,
      input: {
        evalName,
        iconName,
        modelURI,
        sessionId,
        systemPrompt,
        userPrompt,
      },
      signal,
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
        context.workspaceConfig.captureException(error);
        throw toORPCError(error, errors);
      }

      const projectConfig = await newProjectConfig({
        workspaceConfig: context.workspaceConfig,
      });

      const result = await createProject(
        {
          projectConfig,
          workspaceConfig: context.workspaceConfig,
        },
        { signal },
      );

      if (result.isErr()) {
        context.workspaceConfig.captureException(result.error);
        throw toORPCError(result.error, errors);
      }

      await setProjectState(projectConfig.appDir, {
        selectedModelURI: modelURI,
      });

      const modelId = parseModelURI(modelURI)
        .map((m) => m.canonicalId)
        .getOrDefault(model.modelId);
      const projectName = `${modelId} - ${evalName}`;
      const randomTheme = draw(THEMES) ?? DEFAULT_THEME_GRADIENT;
      await updateQuestManifest(
        projectConfig.subdomain,
        context.workspaceConfig,
        {
          icon: {
            background: randomTheme,
            lucide: iconName,
          },
          name: projectName,
        },
      );

      publisher.publish("project.updated", {
        subdomain: result.value.projectConfig.subdomain,
      });

      const messageId = StoreId.newMessageId();
      const createdAt = new Date();
      // For now, we're not using an actual system role
      const promptText = systemPrompt
        ? `${systemPrompt}\n\n${userPrompt}`
        : userPrompt;

      const message: SessionMessage.UserWithParts = {
        id: messageId,
        metadata: {
          createdAt,
          sessionId,
        },
        parts: [
          {
            metadata: {
              createdAt,
              id: StoreId.newPartId(),
              messageId,
              sessionId,
            },
            text: promptText,
            type: "text",
          },
        ],
        role: "user",
      };

      context.workspaceRef.send({
        type: "createSession",
        value: {
          message,
          model,
          sessionId,
          subdomain: result.value.projectConfig.subdomain,
        },
      });

      const workspaceApp = await getWorkspaceAppForSubdomain(
        result.value.projectConfig.subdomain,
        context.workspaceConfig,
      );

      context.workspaceConfig.captureEvent("project.created_from_eval", {
        modelId: model.modelId,
        providerId: model.provider,
      });

      return workspaceApp;
    },
  );

const duplicate = base
  .input(
    z.object({
      keepHistory: z.boolean().optional().default(false),
      sourceSubdomain: ProjectSubdomainSchema,
    }),
  )
  .output(WorkspaceAppProjectSchema)
  .handler(
    async ({
      context,
      errors,
      input: { keepHistory, sourceSubdomain },
      signal,
    }) => {
      const result = await duplicateProject(
        {
          keepHistory,
          sourceSubdomain,
          workspaceConfig: context.workspaceConfig,
        },
        { signal },
      );

      if (result.isErr()) {
        context.workspaceConfig.captureException(result.error);
        throw toORPCError(result.error, errors);
      }

      publisher.publish("project.updated", {
        subdomain: result.value.projectConfig.subdomain,
      });

      const workspaceApp = await getWorkspaceAppForSubdomain(
        result.value.projectConfig.subdomain,
        context.workspaceConfig,
      );

      context.workspaceConfig.captureEvent("project.forked");

      return workspaceApp;
    },
  );

const trash = base
  .input(z.object({ subdomain: ProjectSubdomainSchema }))
  .handler(async ({ context, errors, input: { subdomain } }) => {
    const result = await trashProject({
      subdomain,
      workspaceConfig: context.workspaceConfig,
      workspaceRef: context.workspaceRef,
    });

    if (result.isErr()) {
      context.workspaceConfig.captureException(result.error);
      throw toORPCError(result.error, errors);
    }
    publisher.publish("project.removed", {
      subdomain,
    });

    context.workspaceConfig.captureEvent("project.trashed");
  });

const updateName = base
  .input(z.object({ newName: z.string(), subdomain: ProjectSubdomainSchema }))
  .output(z.void())
  .handler(async ({ context, input }) => {
    await updateQuestManifest(input.subdomain, context.workspaceConfig, {
      name: input.newName,
    });
    publisher.publish("project.updated", {
      subdomain: input.subdomain,
    });

    context.workspaceConfig.captureEvent("project.updated");
  });

const live = {
  bySubdomain: base
    .input(z.object({ subdomain: ProjectSubdomainSchema }))
    .output(eventIterator(WorkspaceAppProjectSchema))
    .handler(async function* ({ context, input, signal }) {
      yield call(bySubdomain, input, { context, signal });

      const projectUpdates = publisher.subscribe("project.updated", { signal });

      for await (const payload of projectUpdates) {
        if (payload.subdomain === input.subdomain) {
          yield call(bySubdomain, input, { context, signal });
        }
      }
    }),
  list: base
    .input(ListInputSchema)
    .output(eventIterator(ProjectsWithTotalSchema))
    .handler(async function* ({ context, input, signal }) {
      yield call(list, input, { context, signal });

      const projectUpdates = publisher.subscribe("project.updated", { signal });
      const projectRemoved = publisher.subscribe("project.removed", { signal });

      for await (const _ of mergeGenerators([projectUpdates, projectRemoved])) {
        yield call(list, input, { context, signal });
      }
    }),
};

export const project = {
  bySubdomain,
  bySubdomains,
  create,
  createFromEval,
  duplicate,
  git: projectGit,
  list,
  live,
  questConfig: projectQuestConfig,
  state: projectState,
  trash,
  updateName,
  version: projectVersion,
};
