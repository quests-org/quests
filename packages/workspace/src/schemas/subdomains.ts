import { z } from "zod";

import { type SubdomainPart, validateSubdomainPart } from "./subdomain-part";

export type PreviewSubdomain = `preview-${SubdomainPart}`;
export type ProjectSubdomain = `project-${SubdomainPart}`;
export type SandboxSubdomain = `sandbox-${SubdomainPart}.${ProjectSubdomain}`;
export type VersionSubdomain = `version-${SubdomainPart}.${ProjectSubdomain}`;

function createPrefixValidation(
  ctx: z.core.ParsePayload,
  val: string,
  prefix: string,
  name: string,
) {
  if (!val.startsWith(prefix)) {
    ctx.issues.push({
      code: "custom",
      fatal: true,
      input: val,
      message: `${name} subdomain must start with '${prefix}'`,
    });
    return false;
  }
  return true;
}

function createSimpleSubdomainSchema<T>(prefix: string, name: string) {
  return z.custom<T>().check((ctx) => {
    const val = ctx.value;

    if (typeof val !== "string") {
      ctx.issues.push({
        code: "custom",
        fatal: true,
        input: val,
        message: "Subdomain must be a string",
      });
      return;
    }

    if (!createPrefixValidation(ctx, val, prefix, name)) {
      return;
    }

    const subdomainPart = val.slice(prefix.length);
    validateSubdomainPart(subdomainPart, ctx);
  });
}

export const PreviewSubdomainSchema =
  createSimpleSubdomainSchema<PreviewSubdomain>("preview-", "Preview");

export const ProjectSubdomainSchema =
  createSimpleSubdomainSchema<ProjectSubdomain>("project-", "Project");

export const SandboxSubdomainSchema = z
  .custom<SandboxSubdomain>()
  .check((ctx) => {
    const val = ctx.value;

    if (typeof val !== "string") {
      ctx.issues.push({
        code: "custom",
        fatal: true,
        input: val,
        message: "Subdomain must be a string",
      });
      return;
    }

    const parts = val.split(".");
    if (parts.length !== 2) {
      ctx.issues.push({
        code: "custom",
        fatal: true,
        input: val,
        message:
          "Sandbox subdomains must have exactly two parts (e.g., sandbox-name.project-name)",
      });
      return;
    }

    const [sandboxPart, projectPart] = parts as [string, string];

    if (
      !createPrefixValidation(
        ctx,
        sandboxPart,
        "sandbox-",
        "First part of sandbox",
      )
    ) {
      return;
    }

    if (
      !createPrefixValidation(
        ctx,
        projectPart,
        "project-",
        "Second part of sandbox",
      )
    ) {
      return;
    }

    const sandboxSubdomainPart = sandboxPart.slice("sandbox-".length);
    const projectSubdomainPart = projectPart.slice("project-".length);

    validateSubdomainPart(sandboxSubdomainPart, ctx);
    validateSubdomainPart(projectSubdomainPart, ctx);
  });

export const VersionSubdomainSchema = z
  .custom<VersionSubdomain>()
  .check((ctx) => {
    const val = ctx.value;

    if (typeof val !== "string") {
      ctx.issues.push({
        code: "custom",
        fatal: true,
        input: val,
        message: "Subdomain must be a string",
      });
      return;
    }

    const parts = val.split(".");
    if (parts.length !== 2) {
      ctx.issues.push({
        code: "custom",
        fatal: true,
        input: val,
        message:
          "Version subdomains must have exactly two parts (e.g., version-commit.project-name)",
      });
      return;
    }

    const [versionPart, projectPart] = parts as [string, string];

    if (
      !createPrefixValidation(
        ctx,
        versionPart,
        "version-",
        "First part of version",
      )
    ) {
      return;
    }

    if (
      !createPrefixValidation(
        ctx,
        projectPart,
        "project-",
        "Second part of version",
      )
    ) {
      return;
    }

    const versionSubdomainPart = versionPart.slice("version-".length);
    const projectSubdomainPart = projectPart.slice("project-".length);

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
