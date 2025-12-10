import { call, eventIterator } from "@orpc/server";
import { AIGatewayModelURI } from "@quests/ai-gateway";
import { ProjectModeSchema } from "@quests/shared";
import {
  AppIconsSchema,
  DEFAULT_THEME_GRADIENT,
  SelectableAppIconsSchema,
  THEMES,
} from "@quests/shared/icons";
import { mergeGenerators } from "@quests/shared/merge-generators";
import { draw } from "radashi";
import { z } from "zod";

import { DEFAULT_TEMPLATE_NAME } from "../../../constants";
import { createAppConfig } from "../../../lib/app-config/create";
import { newProjectConfig } from "../../../lib/app-config/new";
import { createProjectApp } from "../../../lib/create-project-app";
import { defaultProjectName } from "../../../lib/default-project-name";
import { duplicateProject } from "../../../lib/duplicate-project";
import { exportProjectZip } from "../../../lib/export-project-zip";
import { generateChatTitle } from "../../../lib/generate-project-title";
import { generateProjectTitleAndIcon } from "../../../lib/generate-project-title-and-icon";
import { getApp, getProjects } from "../../../lib/get-apps";
import { getWorkspaceAppForSubdomain } from "../../../lib/get-workspace-app-for-subdomain";
import { pathExists } from "../../../lib/path-exists";
import { projectModeForSubdomain } from "../../../lib/project-mode-for-subdomain";
import { setProjectState } from "../../../lib/project-state-store";
import {
  getQuestManifest,
  updateQuestManifest,
} from "../../../lib/quest-manifest";
import { trashProject } from "../../../lib/trash-project";
import {
  appendFilesToMessage,
  UploadedFileSchema,
  writeUploadedFiles,
} from "../../../lib/write-uploaded-files";
import { getWorkspaceServerURL } from "../../../logic/server/url";
import { WorkspaceAppProjectSchema } from "../../../schemas/app";
import { AbsolutePathSchema } from "../../../schemas/paths";
import { SessionMessage } from "../../../schemas/session/message";
import { StoreId } from "../../../schemas/store-id";
import { ProjectSubdomainSchema } from "../../../schemas/subdomains";
import { base, toORPCError } from "../../base";
import { publisher } from "../../publisher";
import { projectGit } from "./git";
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
      files: z.array(UploadedFileSchema).optional(),
      message: SessionMessage.UserSchemaWithParts,
      mode: ProjectModeSchema,
      modelURI: AIGatewayModelURI.Schema,
      sessionId: StoreId.SessionSchema,
      templateName: z.string().optional().default(DEFAULT_TEMPLATE_NAME),
    }),
  )
  .output(WorkspaceAppProjectSchema)
  .handler(
    async ({
      context,
      errors,
      input: { files, message, mode, modelURI, sessionId, templateName },
      signal,
    }) => {
      const [model, error] = (
        await context.modelRegistry.languageModel(
          modelURI,
          context.workspaceConfig.getAIProviderConfigs(),
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
        mode,
        workspaceConfig: context.workspaceConfig,
      });

      if (mode === "app-builder" || mode === "eval") {
        const result = await createProjectApp(
          {
            projectConfig,
            templateName,
            workspaceConfig: context.workspaceConfig,
          },
          { signal },
        );

        if (result.isErr()) {
          context.workspaceConfig.captureException(result.error);
          throw toORPCError(result.error, errors);
        }
      }

      await setProjectState(projectConfig.appDir, {
        selectedModelURI: modelURI,
      });

      await updateQuestManifest(projectConfig.appDir, {
        name: defaultProjectName(message),
      });

      publisher.publish("project.updated", {
        subdomain: projectConfig.subdomain,
      });

      if (mode === "chat") {
        void (async () => {
          const titleResult = await generateChatTitle({
            message,
            model,
          });

          if (titleResult.isOk()) {
            await updateQuestManifest(projectConfig.appDir, {
              name: titleResult.value,
            });
            publisher.publish("project.updated", {
              subdomain: projectConfig.subdomain,
            });
          }
        })().catch(context.workspaceConfig.captureException);
      } else {
        generateProjectTitleAndIcon({
          message,
          model,
          onUpdate: () => {
            publisher.publish("project.updated", {
              subdomain: projectConfig.subdomain,
            });
          },
          projectConfig,
          templateName,
          workspaceConfig: context.workspaceConfig,
        }).catch(context.workspaceConfig.captureException);
      }

      publisher.publish("project.updated", {
        subdomain: projectConfig.subdomain,
      });

      let messageWithFiles = message;
      if (files && files.length > 0) {
        const uploadResult = await writeUploadedFiles(
          projectConfig.appDir,
          files,
        );
        messageWithFiles = appendFilesToMessage(message, uploadResult.paths);
      }

      context.workspaceRef.send({
        type: "createSession",
        value: {
          agentName: mode === "chat" ? "chat" : "app-builder",
          message: messageWithFiles,
          model,
          sessionId,
          subdomain: projectConfig.subdomain,
        },
      });

      const workspaceApp = await getWorkspaceAppForSubdomain(
        projectConfig.subdomain,
        context.workspaceConfig,
      );

      context.workspaceConfig.captureEvent("project.created", {
        files_count: files?.length ?? 0,
        modelId: model.modelId,
        project_mode: mode,
        providerId: model.provider,
        template_name: templateName,
      });

      return workspaceApp;
    },
  );

const createFromEval = base
  .input(
    z.object({
      evalName: z.string(),
      iconName: SelectableAppIconsSchema,
      modelURI: AIGatewayModelURI.Schema,
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
          context.workspaceConfig.getAIProviderConfigs(),
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
        evalName,
        mode: "eval",
        modelURI,
        workspaceConfig: context.workspaceConfig,
      });

      const result = await createProjectApp(
        {
          projectConfig,
          templateName: DEFAULT_TEMPLATE_NAME,
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

      const modelId = AIGatewayModelURI.parse(modelURI)
        .map((m) => m.canonicalId)
        .getOrDefault(model.modelId);
      const projectName = `${evalName} - ${modelId}`;
      const randomTheme = draw(THEMES) ?? DEFAULT_THEME_GRADIENT;
      await updateQuestManifest(projectConfig.appDir, {
        icon: {
          background: randomTheme,
          lucide: iconName,
        },
        name: projectName,
      });

      publisher.publish("project.updated", {
        subdomain: projectConfig.subdomain,
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
          agentName: "app-builder",
          message,
          model,
          sessionId,
          subdomain: projectConfig.subdomain,
        },
      });

      const workspaceApp = await getWorkspaceAppForSubdomain(
        projectConfig.subdomain,
        context.workspaceConfig,
      );

      context.workspaceConfig.captureEvent("project.created", {
        eval_name: evalName,
        files_count: 0,
        modelId: model.modelId,
        project_mode: projectModeForSubdomain(projectConfig.subdomain),
        providerId: model.provider,
        template_name: DEFAULT_TEMPLATE_NAME,
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

    context.workspaceConfig.captureEvent("project.trashed", {
      project_mode: projectModeForSubdomain(subdomain),
    });
  });

const update = base
  .input(
    z.object({
      icon: z
        .object({
          background: z.string(),
          lucide: AppIconsSchema,
        })
        .optional(),
      name: z.string(),
      subdomain: ProjectSubdomainSchema,
    }),
  )
  .output(z.void())
  .handler(async ({ context, input }) => {
    const projectConfig = createAppConfig({
      subdomain: input.subdomain,
      workspaceConfig: context.workspaceConfig,
    });
    await updateQuestManifest(projectConfig.appDir, {
      icon: input.icon,
      name: input.name,
    });

    publisher.publish("project.updated", {
      subdomain: input.subdomain,
    });

    context.workspaceConfig.captureEvent("project.updated", {
      project_mode: projectModeForSubdomain(input.subdomain),
    });
  });

const exportZip = base
  .errors({
    EXPORT_FAILED: {
      message: "Failed to export project",
    },
  })
  .input(
    z.object({
      includeChat: z.boolean().default(false),
      outputPath: z.string(),
      subdomain: ProjectSubdomainSchema,
    }),
  )
  .output(
    z.object({
      filename: z.string(),
      filepath: z.string(),
    }),
  )
  .handler(async ({ context, errors, input }) => {
    try {
      const appConfig = createAppConfig({
        subdomain: input.subdomain,
        workspaceConfig: context.workspaceConfig,
      });

      const manifest = await getQuestManifest(appConfig.appDir);
      const projectName = manifest?.name ?? input.subdomain;

      const safeName = projectName
        .toLowerCase()
        .replaceAll(/[^a-z0-9-]/g, "-")
        .replaceAll(/-+/g, "-")
        .replaceAll(/^-|-$/g, "")
        .slice(0, 50);

      let counter = 1;
      let filename = `${safeName}.zip`;
      let filepath = `${input.outputPath}/${filename}`;

      while (await pathExists(AbsolutePathSchema.parse(filepath))) {
        counter++;
        filename = `${safeName}-${counter}.zip`;
        filepath = `${input.outputPath}/${filename}`;
      }

      const result = await exportProjectZip({
        appDir: appConfig.appDir,
        includeChat: input.includeChat,
        outputPath: filepath,
      });

      if (result.isErr()) {
        throw errors.EXPORT_FAILED({ message: result.error.message });
      }

      context.workspaceConfig.captureEvent("project.shared", {
        share_type: "exported_zip",
      });

      return { filename, filepath };
    } catch (error) {
      throw errors.EXPORT_FAILED({
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
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
  bySubdomains: base
    .input(z.object({ subdomains: ProjectSubdomainSchema.array() }))
    .output(
      eventIterator(
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
      ),
    )
    .handler(async function* ({ context, input, signal }) {
      yield call(bySubdomains, input, { context, signal });

      const projectUpdates = publisher.subscribe("project.updated", { signal });
      const projectRemoved = publisher.subscribe("project.removed", { signal });

      for await (const payload of mergeGenerators([
        projectUpdates,
        projectRemoved,
      ])) {
        if (input.subdomains.includes(payload.subdomain)) {
          yield call(bySubdomains, input, { context, signal });
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
  exportZip,
  git: projectGit,
  list,
  live,
  state: projectState,
  trash,
  update,
  version: projectVersion,
};
