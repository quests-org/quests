import {
  ProjectSubdomainSchema,
  type SandboxSubdomain,
  type VersionSubdomain,
} from "../schemas/subdomains";

export function projectSubdomainForSubdomain(
  subdomain: SandboxSubdomain | VersionSubdomain,
) {
  const projectSubdomain = ProjectSubdomainSchema.parse(
    subdomain.split(".")[1],
  );
  return projectSubdomain;
}
