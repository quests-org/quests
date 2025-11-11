import { monotonicFactory } from "ulid";

import { ProjectSubdomainSchema } from "../../schemas/subdomains";
import { type WorkspaceConfig } from "../../types";
import { createAppConfig } from "./create";

const ulid = monotonicFactory();

export function newChatConfig({
  workspaceConfig,
}: {
  workspaceConfig: WorkspaceConfig;
}) {
  const chatId = `chat-${ulid().toLowerCase()}`;
  return createAppConfig({
    subdomain: ProjectSubdomainSchema.parse(chatId),
    workspaceConfig,
  });
}
