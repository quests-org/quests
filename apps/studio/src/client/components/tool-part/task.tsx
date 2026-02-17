import {
  type SessionMessage,
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { type ReactNode } from "react";

import { rpcClient } from "../../rpc/client";

export function ToolPartTask({
  project,
  renderStream,
  sessionId,
}: {
  project: WorkspaceAppProject;
  renderStream: (messages: SessionMessage.WithParts[]) => ReactNode;
  sessionId: StoreId.Session;
}) {
  const {
    data: messages,
    error,
    isLoading,
  } = useQuery(
    rpcClient.workspace.message.live.listWithParts.experimental_liveOptions({
      input: {
        sessionId,
        subdomain: project.subdomain,
      },
    }),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Error loading messages: {error.message}
      </div>
    );
  }

  return (
    <div className="border-l-2 border-accent/30 pl-3">
      {renderStream(messages ?? [])}
    </div>
  );
}
