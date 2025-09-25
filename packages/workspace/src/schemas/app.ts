import { z } from "zod";

import { QuestManifestSchema } from "./quest-manifest";
import {
  PreviewSubdomainSchema,
  ProjectSubdomainSchema,
  SandboxSubdomainSchema,
  VersionSubdomainSchema,
} from "./subdomains";

const WorkspaceAppBaseSchema = z.object({
  createdAt: z.date(),
  description: QuestManifestSchema.shape.description.optional(),
  folderName: z.string(),
  icon: QuestManifestSchema.shape.icon.optional(),
  title: z.string(),
  updatedAt: z.date(),
  urls: z.object({
    localhost: z.string(),
    localRedirect: z.string(),
    loopback: z.string(),
  }),
});

export const WorkspaceAppPreviewSchema = WorkspaceAppBaseSchema.extend({
  subdomain: PreviewSubdomainSchema,
  type: z.literal("preview"),
});

export const WorkspaceAppProjectSchema = WorkspaceAppBaseSchema.extend({
  subdomain: ProjectSubdomainSchema,
  type: z.literal("project"),
});

const WorkspaceAppSandboxSchema = WorkspaceAppBaseSchema.extend({
  project: z.lazy(() => WorkspaceAppProjectSchema),
  subdomain: SandboxSubdomainSchema,
  type: z.literal("sandbox"),
});

const WorkspaceAppVersionSchema = WorkspaceAppBaseSchema.extend({
  project: z.lazy(() => WorkspaceAppProjectSchema),
  subdomain: VersionSubdomainSchema,
  type: z.literal("version"),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const WorkspaceAppSchema = z.discriminatedUnion("type", [
  WorkspaceAppPreviewSchema,
  WorkspaceAppProjectSchema,
  WorkspaceAppSandboxSchema,
  WorkspaceAppVersionSchema,
]);

export type WorkspaceApp = z.output<typeof WorkspaceAppSchema>;
export type WorkspaceAppPreview = z.output<typeof WorkspaceAppPreviewSchema>;
export type WorkspaceAppProject = z.output<typeof WorkspaceAppProjectSchema>;
export type WorkspaceAppSandbox = z.output<typeof WorkspaceAppSandboxSchema>;
export type WorkspaceAppVersion = z.output<typeof WorkspaceAppVersionSchema>;
