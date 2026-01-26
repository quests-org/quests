import { z } from "zod";

import { type SubdomainPart, validateSubdomainPart } from "./subdomain-part";

export const PREVIEW_SUBDOMAIN_PART = "preview" as const;
export type PreviewSubdomain = `${SubdomainPart}.${PreviewSubdomainPart}`;
export type ProjectSubdomain = SubdomainPart & z.$brand<"ProjectSubdomain">;

export type SandboxSubdomain = `sandbox-${SubdomainPart}.${ProjectSubdomain}`;
export type VersionSubdomain = `version-${SubdomainPart}.${ProjectSubdomain}`;
type PreviewSubdomainPart = typeof PREVIEW_SUBDOMAIN_PART;

function ensureString(val: unknown, ctx: z.core.$RefinementCtx): val is string {
  if (typeof val !== "string") {
    ctx.addIssue({
      code: "custom",
      fatal: true,
      input: val,
      message: "Subdomain must be a string",
    });
    return false;
  }
  return true;
}

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

function validateTwoPartSubdomain(
  val: string,
  ctx: z.core.$RefinementCtx,
  errorMessage: string,
): [string, string] | null {
  const parts = val.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    ctx.addIssue({
      code: "custom",
      fatal: true,
      input: val,
      message: errorMessage,
    });
    return null;
  }
  return [parts[0], parts[1]];
}

export const PreviewSubdomainSchema = z
  .custom<PreviewSubdomain>()
  .superRefine((val: unknown, ctx) => {
    if (!ensureString(val, ctx)) {
      return;
    }

    const parts = validateTwoPartSubdomain(
      val,
      ctx,
      "Preview subdomains must have exactly two parts (e.g., name.preview)",
    );
    if (!parts) {
      return;
    }

    const [previewPart, suffix] = parts;

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
    if (!ensureString(val, ctx)) {
      return;
    }

    if (val.includes(".")) {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        input: val,
        message: "Project subdomains cannot contain dots",
      });
    }

    if (val === PREVIEW_SUBDOMAIN_PART) {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        input: val,
        message: `Project subdomains cannot be '${PREVIEW_SUBDOMAIN_PART}'`,
      });
    }

    if (val.startsWith("sandbox-")) {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        input: val,
        message: "Project subdomains cannot start with 'sandbox-'",
      });
    }

    if (val.startsWith("version-")) {
      ctx.addIssue({
        code: "custom",
        fatal: true,
        input: val,
        message: "Project subdomains cannot start with 'version-'",
      });
    }

    validateSubdomainPart(val, ctx);
  });

export const SandboxSubdomainSchema = z
  .custom<SandboxSubdomain>()
  .superRefine((val: unknown, ctx) => {
    if (!ensureString(val, ctx)) {
      return;
    }

    const parts = validateTwoPartSubdomain(
      val,
      ctx,
      "Sandbox subdomains must have exactly two parts (e.g., sandbox-name.project-name)",
    );
    if (!parts) {
      return;
    }

    const [sandboxPart, projectPart] = parts;

    validateSubdomainPrefix(
      ctx,
      sandboxPart,
      "sandbox-",
      "First part of sandbox",
    );

    const sandboxSubdomainPart = sandboxPart.slice("sandbox-".length);

    validateSubdomainPart(sandboxSubdomainPart, ctx);
    validateSubdomainPart(projectPart, ctx);
  });

export const VersionSubdomainSchema = z
  .custom<VersionSubdomain>()
  .superRefine((val: unknown, ctx) => {
    if (!ensureString(val, ctx)) {
      return;
    }

    const parts = validateTwoPartSubdomain(
      val,
      ctx,
      "Version subdomains must have exactly two parts (e.g., version-commit.project-name)",
    );
    if (!parts) {
      return;
    }

    const [versionPart, projectPart] = parts;

    validateSubdomainPrefix(
      ctx,
      versionPart,
      "version-",
      "First part of version",
    );

    const versionSubdomainPart = versionPart.slice("version-".length);

    validateSubdomainPart(versionSubdomainPart, ctx);
    validateSubdomainPart(projectPart, ctx);
  });

export const AppSubdomainSchema = z.union([
  PreviewSubdomainSchema,
  ProjectSubdomainSchema,
  SandboxSubdomainSchema,
  VersionSubdomainSchema,
]);

export type AppSubdomain = z.output<typeof AppSubdomainSchema>;
