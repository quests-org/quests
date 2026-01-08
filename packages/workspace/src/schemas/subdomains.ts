import { z } from "zod";

import { type SubdomainPart, validateSubdomainPart } from "./subdomain-part";

export const PREVIEW_SUBDOMAIN_PART = "preview" as const;
export type PreviewSubdomain = `${SubdomainPart}.${PreviewSubdomainPart}`;
export type ProjectSubdomain = SubdomainPart & z.$brand<"ProjectSubdomain">;

export type SandboxSubdomain = `sandbox-${SubdomainPart}.${ProjectSubdomain}`;
export type VersionSubdomain = `version-${SubdomainPart}.${ProjectSubdomain}`;
type PreviewSubdomainPart = typeof PREVIEW_SUBDOMAIN_PART;

function validateSubdomainPrefix(
  ctx: z.core.$RefinementCtx,
  val: string,
  prefix: string,
  name: string,
) {
  if (!val.startsWith(prefix)) {
    ctx.addIssue({
      code: "custom",
      fatal: true,
      input: val,
      message: `${name} subdomain must start with '${prefix}'`,
    });
  }
}

export const PreviewSubdomainSchema = z
  .custom<PreviewSubdomain>()
  .superRefine((val: unknown, ctx) => {
    if (typeof val !== "string") {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        input: val,
        message: "Subdomain must be a string",
      });
      return;
    }

    const parts = val.split(".");
    if (parts.length !== 2) {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        input: val,
        message:
          "Preview subdomains must have exactly two parts (e.g., name.preview)",
      });
    }

    const [previewPart, suffix] = parts as [string, string];

    if (suffix !== PREVIEW_SUBDOMAIN_PART) {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        input: val,
        message: `Preview subdomains must end with '.${PREVIEW_SUBDOMAIN_PART}'`,
      });
    }

    validateSubdomainPart(previewPart, ctx);
  });

export const ProjectSubdomainSchema = z
  .custom<ProjectSubdomain>()
  .superRefine((val: unknown, ctx) => {
    if (typeof val !== "string") {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        input: val,
        message: "Subdomain must be a string",
      });
      return;
    }

    if (val === PREVIEW_SUBDOMAIN_PART) {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        input: val,
        message: "Project subdomains cannot be 'preview'",
      });
    }

    validateSubdomainPart(val, ctx);
  });

export const SandboxSubdomainSchema = z
  .custom<SandboxSubdomain>()
  .superRefine((val: unknown, ctx) => {
    if (typeof val !== "string") {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        input: val,
        message: "Subdomain must be a string",
      });
      return;
    }

    const parts = val.split(".");
    if (parts.length !== 2) {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        input: val,
        message:
          "Sandbox subdomains must have exactly two parts (e.g., sandbox-name.project-name)",
      });
    }

    const [sandboxPart, projectPart] = parts as [string, string];

    validateSubdomainPrefix(
      ctx,
      sandboxPart,
      "sandbox-",
      "First part of sandbox",
    );

    const sandboxSubdomainPart = sandboxPart.slice("sandbox-".length);
    const projectSubdomainPart = projectPart;

    validateSubdomainPart(sandboxSubdomainPart, ctx);
    validateSubdomainPart(projectSubdomainPart, ctx);
  });

export const VersionSubdomainSchema = z
  .custom<VersionSubdomain>()
  .superRefine((val: unknown, ctx) => {
    if (typeof val !== "string") {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        input: val,
        message: "Subdomain must be a string",
      });
      return;
    }

    const parts = val.split(".");
    if (parts.length !== 2) {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        input: val,
        message:
          "Version subdomains must have exactly two parts (e.g., version-commit.project-name)",
      });
    }

    const [versionPart, projectPart] = parts as [string, string];

    validateSubdomainPrefix(
      ctx,
      versionPart,
      "version-",
      "First part of version",
    );

    const versionSubdomainPart = versionPart.slice("version-".length);
    const projectSubdomainPart = projectPart;

    validateSubdomainPart(versionSubdomainPart, ctx);
    validateSubdomainPart(projectSubdomainPart, ctx);
  });

export const AppSubdomainSchema = z.union([
  PreviewSubdomainSchema,
  ProjectSubdomainSchema,
  SandboxSubdomainSchema,
  VersionSubdomainSchema,
]);

export type AppSubdomain = z.output<typeof AppSubdomainSchema>;
