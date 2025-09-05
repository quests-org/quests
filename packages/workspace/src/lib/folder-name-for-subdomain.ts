import { err, ok } from "neverthrow";

import {
  type AppSubdomain,
  PREVIEW_SUBDOMAIN_PART,
} from "../schemas/subdomains";

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

  // Handle preview subdomains which have format: {name}.preview
  if (subdomain.endsWith(`.${PREVIEW_SUBDOMAIN_PART}`)) {
    const [previewPart] = subdomain.split(".");
    if (!previewPart) {
      return err({
        message: "Invalid preview subdomain format",
        type: "schema-error" as const,
      });
    }
    return ok(previewPart);
  }

  // Handle project subdomains (no prefix, just the subdomain part)
  return ok(subdomain);
}
