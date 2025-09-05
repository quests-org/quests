import {
  type ProjectSubdomain,
  ProjectSubdomainSchema,
} from "@quests/workspace/client";

export function migrateProjectSubdomain(subdomain: ProjectSubdomain) {
  // We used to prefix project subdomains with "project-"
  // Added on 2025-09-05, remove after 2025-10-05
  if (subdomain.startsWith("project-")) {
    const migratedSubdomain = ProjectSubdomainSchema.parse(
      subdomain.replaceAll(/^project-/g, ""),
    );
    return { didMigrate: true, subdomain: migratedSubdomain };
  }
  return { didMigrate: false, subdomain };
}
