import { err, ok } from "neverthrow";

import { type AppSubdomain } from "../schemas/subdomains";

export function folderNameForSubdomain(subdomain: AppSubdomain) {
  // Handle sandbox subdomains which have format: sandbox-{name}.{project-subdomain}
  if (subdomain.startsWith("sandbox-")) {
    const [sandboxPart] = subdomain.split(".");
    if (!sandboxPart) {
      return err({
        message: "Invalid sandbox format",
        type: "schema-error" as const,
      });
    }
    return ok(sandboxPart.slice("sandbox-".length));
  }

  // Handle version subdomains which have format: version-{ref}.{project-subdomain}
  if (subdomain.startsWith("version-")) {
    const [versionPart] = subdomain.split(".");
    if (!versionPart) {
      return err({
        message: "Invalid version format",
        type: "schema-error" as const,
      });
    }
    return ok(versionPart.slice("version-".length));
  }

  // Handle preview and project subdomains
  const parts = subdomain.split("-");
  if (parts.length < 2) {
    return err({
      message: "Invalid subdomain format",
      type: "schema-error" as const,
    });
  }

  return ok(parts.slice(1).join("-"));
}
