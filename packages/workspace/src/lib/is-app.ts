import {
  type AppSubdomain,
  PREVIEW_SUBDOMAIN_PART,
  type PreviewSubdomain,
  type ProjectSubdomain,
  type SandboxSubdomain,
  type VersionSubdomain,
} from "../schemas/subdomains";

export function isPreviewSubdomain(
  subdomain: AppSubdomain,
): subdomain is PreviewSubdomain {
  return subdomain.endsWith(`.${PREVIEW_SUBDOMAIN_PART}`);
}

export function isProjectSubdomain(
  subdomain: AppSubdomain,
): subdomain is ProjectSubdomain {
  // Project subdomains are top level subdomains and not "preview"
  return !subdomain.includes(".") && subdomain !== PREVIEW_SUBDOMAIN_PART;
}

export function isSandboxSubdomain(
  subdomain: AppSubdomain,
): subdomain is SandboxSubdomain {
  return subdomain.startsWith("sandbox-");
}

export function isVersionSubdomain(
  subdomain: AppSubdomain,
): subdomain is VersionSubdomain {
  return subdomain.startsWith("version-");
}
