import {
  type StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { rpcClient } from "../../rpc/client";
import { SessionStream } from "../session-stream";

export function ToolPartTask({
  project,
  sessionId,
}: {
  project: WorkspaceAppProject;
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
      <SessionStream
        isAgentRunning={false}
        isDeveloperMode={false}
        messages={messages ?? []}
        onContinue={() => {
          toast.info("Continue not available for nested sessions");
        }}
        onModelChange={() => {
          toast.info("Model change not available for nested sessions");
        }}
        onRetry={() => {
          toast.info("Retry not available for nested sessions");
        }}
        onStartNewChat={() => {
          toast.info("New chat not available for nested sessions");
        }}
        project={project}
      />
    </div>
  );
}
