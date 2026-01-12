import { call, eventIterator } from "@orpc/server";
import { AIGatewayModelURI } from "@quests/ai-gateway";
import { mergeGenerators } from "@quests/shared/merge-generators";
import { z } from "zod";

import { createAppConfig } from "../../../lib/app-config/create";
import { newProjectConfig } from "../../../lib/app-config/new";
import { createMessage } from "../../../lib/create-message";
import { defaultProjectName } from "../../../lib/default-project-name";
import { duplicateProject } from "../../../lib/duplicate-project";
import { exportProjectZip } from "../../../lib/export-project-zip";
import { generateProjectTitle } from "../../../lib/generate-project-title";
import { getApp, getProjects } from "../../../lib/get-apps";
import { getWorkspaceAppForSubdomain } from "../../../lib/get-workspace-app-for-subdomain";
import { importProject as importProjectLib } from "../../../lib/import-project";
import { initializeProject } from "../../../lib/initialize-project";
import { pathExists } from "../../../lib/path-exists";
import {
  getProjectManifest,
  updateProjectManifest,
} from "../../../lib/project-manifest";
import { resolveModel } from "../../../lib/resolve-model";
import { trashProject } from "../../../lib/trash-project";
import { WorkspaceAppProjectSchema } from "../../../schemas/app";
import { AbsolutePathSchema } from "../../../schemas/paths";
import { StoreId } from "../../../schemas/store-id";
import { SubdomainPartSchema } from "../../../schemas/subdomain-part";
import { ProjectSubdomainSchema } from "../../../schemas/subdomains";
import { Upload } from "../../../schemas/upload";
import { base, toORPCError } from "../../base";
import { publisher } from "../../publisher";
import { projectGit } from "./git";
import { projectState } from "./state";
import { projectVersion } from "./version";

const DEFAULT_TEMPLATE_NAME = "basic";

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
      files: z.array(Upload.Schema).optional(),
      iconName: z.literal("flask-conical").optional(),
      modelURI: AIGatewayModelURI.Schema,
      name: z.string().trim().min(1).optional(),
      preferredFolderName: SubdomainPartSchema.optional(),
      prompt: z.string(),
      templateName: z.string().optional().default(DEFAULT_TEMPLATE_NAME),
    }),
  )
  .output(
    z.object({
      sessionId: StoreId.SessionSchema,
      subdomain: ProjectSubdomainSchema,
    }),
  )
  .handler(
    async ({
      context,
      errors,
      input: {
        files,
        iconName,
        modelURI,
        name,
        preferredFolderName,
        prompt,
        templateName,
      },
      signal,
    }) => {
      const model = await resolveModel(modelURI, context, errors);

      const projectConfig = await newProjectConfig({
        preferredFolderName,
        workspaceConfig: context.workspaceConfig,
      });

      const result = await initializeProject(
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

      const messageResult = await createMessage({
        appConfig: projectConfig,
        files,
        model,
        modelURI,
        prompt,
      });

      if (messageResult.isErr()) {
        context.workspaceConfig.captureException(messageResult.error);
        throw toORPCError(messageResult.error, errors);
      }
      const message = messageResult.value;

      await updateProjectManifest(projectConfig, {
        iconName,
        name: name ?? defaultProjectName(message),
      });

      if (!name) {
        // Intentionally non blocking
        generateProjectTitle({
          message,
          model,
          // Only relevant for non default templates
          templateTitle:
            templateName === DEFAULT_TEMPLATE_NAME ? undefined : templateName,
        }).then(async (title) => {
          if (title.isOk()) {
            await updateProjectManifest(projectConfig, {
              name: title.value,
            });
          } else {
            context.workspaceConfig.captureException(title.error);
          }
        });
      }

      publisher.publish("project.updated", {
        subdomain: projectConfig.subdomain,
      });

      context.workspaceRef.send({
        type: "createSession",
        value: {
          message,
          model,
          sessionId: message.metadata.sessionId,
          subdomain: projectConfig.subdomain,
        },
      });

      context.workspaceConfig.captureEvent("project.created", {
        files_count: files?.length ?? 0,
        modelId: model.modelId,
        providerId: model.provider,
        template_name: templateName,
      });

      return {
        sessionId: message.metadata.sessionId,
        subdomain: projectConfig.subdomain,
      };
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

const importProject = base
  .input(
    z.object({
      zipFileData: z.string(),
    }),
  )
  .output(
    z.object({
      subdomain: ProjectSubdomainSchema,
    }),
  )
  .handler(async ({ context, errors, input: { zipFileData }, signal }) => {
    const result = await importProjectLib(
      {
        workspaceConfig: context.workspaceConfig,
        zipFileData,
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

    context.workspaceConfig.captureEvent("project.imported");

    return { subdomain: result.value.projectConfig.subdomain };
  });

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

const update = base
  .input(
    z.object({
      name: z.string().trim().min(1),
      subdomain: ProjectSubdomainSchema,
    }),
  )
  .output(z.void())
  .handler(async ({ context, input }) => {
    const projectConfig = createAppConfig({
      subdomain: input.subdomain,
      workspaceConfig: context.workspaceConfig,
    });
    await updateProjectManifest(projectConfig, {
      name: input.name,
    });

    publisher.publish("project.updated", {
      subdomain: input.subdomain,
    });

    context.workspaceConfig.captureEvent("project.updated");
  });

const exportZip = base
  .errors({
    EXPORT_FAILED: {
      message: "Failed to export project",
    },
  })
  .input(
    z.object({
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

      const manifest = await getProjectManifest(appConfig.appDir);
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
  duplicate,
  exportZip,
  git: projectGit,
  import: importProject,
  list,
  live,
  state: projectState,
  trash,
  update,
  version: projectVersion,
};
