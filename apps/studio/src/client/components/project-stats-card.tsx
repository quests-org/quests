import { AppIcon } from "@/client/components/app-icon";
import { rpcClient } from "@/client/rpc/client";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar, Clock, FileText, MessageSquare } from "lucide-react";

export function ProjectStatsCard({
  project,
}: {
  project: WorkspaceAppProject;
}) {
  const { data: messageCount } = useQuery(
    rpcClient.workspace.message.count.queryOptions({
      input: { subdomain: project.subdomain },
    }),
  );

  const { data: filesAddedCount } = useQuery({
    ...rpcClient.workspace.project.git.filesAddedSinceInitial.queryOptions({
      input: { projectSubdomain: project.subdomain },
    }),
  });

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
      <AppIcon name={project.iconName} size="lg" />
      <div className="flex flex-col gap-2">
        <div className="font-medium text-foreground">{project.title}</div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="size-3" />
            <span>Created {format(project.createdAt, "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="size-3" />
            <span>
              Updated{" "}
              {formatDistanceToNow(project.updatedAt, { addSuffix: true })
                .replace("less than ", "")
                .replace("about ", "")}
            </span>
          </div>
          {messageCount !== undefined && messageCount > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="size-3" />
              <span>
                {messageCount} {messageCount === 1 ? "message" : "messages"}
              </span>
            </div>
          )}
          {filesAddedCount !== null &&
            filesAddedCount !== undefined &&
            filesAddedCount > 0 && (
              <div className="flex items-center gap-1">
                <FileText className="size-3" />
                <span>
                  {filesAddedCount} {filesAddedCount === 1 ? "file" : "files"}{" "}
                  added
                </span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
