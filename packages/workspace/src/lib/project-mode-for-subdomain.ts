import { type ProjectMode } from "@quests/shared";

import { type ProjectSubdomain } from "../schemas/subdomains";

// Confusing, because we also store this in the quest.json manifest. Technically
// a chat is the same as a project, just without an app.
// Someday we may support converting a chat into a project, in which case this
// would be the default mode.
export function projectModeForSubdomain(
  subdomain: ProjectSubdomain,
): ProjectMode {
  if (subdomain.startsWith("chat-")) {
    return "chat";
  }
  return "app-builder";
}
