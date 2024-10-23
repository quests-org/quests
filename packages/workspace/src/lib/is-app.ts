import {
  type AppSubdomain,
  type ProjectSubdomain,
  type SandboxSubdomain,
  type VersionSubdomain,
} from "../schemas/subdomains";

export function isProjectSubdomain(
  subdomain: AppSubdomain,
): subdomain is ProjectSubdomain {
  return subdomain.startsWith("project-");
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
