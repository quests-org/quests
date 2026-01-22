import {
  type PreviewSubdomain,
  PreviewSubdomainSchema,
  type ProjectSubdomain,
  ProjectSubdomainSchema,
  type SandboxSubdomain,
  SandboxSubdomainSchema,
  type VersionSubdomain,
  VersionSubdomainSchema,
} from "../schemas/subdomains";

export function isPreviewSubdomain(
  subdomain: string,
): subdomain is PreviewSubdomain {
  return PreviewSubdomainSchema.safeParse(subdomain).success;
}

export function isProjectSubdomain(
  subdomain: string,
): subdomain is ProjectSubdomain {
  return ProjectSubdomainSchema.safeParse(subdomain).success;
}

export function isSandboxSubdomain(
  subdomain: string,
): subdomain is SandboxSubdomain {
  return SandboxSubdomainSchema.safeParse(subdomain).success;
}

export function isVersionSubdomain(
  subdomain: string,
): subdomain is VersionSubdomain {
  return VersionSubdomainSchema.safeParse(subdomain).success;
}
