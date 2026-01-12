import { AppIcon } from "@/client/components/app-icon";
import { rpcClient } from "@/client/rpc/client";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { FileText, MessageSquare } from "lucide-react";

export function ProjectStatsCard({
  project,
}: {
  project: WorkspaceAppProject;
}) {
  const { data: fileCount } = useQuery({
    ...rpcClient.workspace.project.git.trackedFileCount.queryOptions({
      input: { projectSubdomain: project.subdomain },
    }),
  });

  const { data: messageCount } = useQuery(
    rpcClient.workspace.message.count.queryOptions({
      input: { subdomain: project.subdomain },
    }),
  );

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
      <AppIcon name={project.iconName} size="lg" />
      <div className="flex flex-col gap-1">
        <div className="font-medium text-foreground">{project.title}</div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {fileCount !== undefined && (
            <div className="flex items-center gap-1">
              <FileText className="size-3" />
              <span>
                {fileCount} {fileCount === 1 ? "file" : "files"}
              </span>
            </div>
          )}
          {messageCount !== undefined && messageCount > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="size-3" />
              <span>
                {messageCount} {messageCount === 1 ? "message" : "messages"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
