import { type ProjectMode } from "@quests/shared";

import { type AppSubdomain } from "../schemas/subdomains";
import { isProjectSubdomain } from "./is-app";

// Confusing, because we also store this in the quest.json manifest. Technically
// a chat is the same as a project, just without an app.
// Someday we may support converting a chat into a project, in which case this
// would be the default mode.
export function projectModeForSubdomain(subdomain: AppSubdomain): ProjectMode {
  // Sandboxes and versions are always app-builder, however we don't use "mode"
  // for them right now.
  if (!isProjectSubdomain(subdomain)) {
    return "app-builder";
  }
  if (subdomain.startsWith("chat-")) {
    return "chat";
  }
  return "app-builder";
}
