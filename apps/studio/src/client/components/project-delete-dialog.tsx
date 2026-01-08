import { AppIcon } from "@/client/components/app-icon";
import { DeleteWithProgressDialog } from "@/client/components/delete-with-progress-dialog";
import { useTrashApp } from "@/client/hooks/use-trash-app";
import { getTrashTerminology } from "@/client/lib/trash-terminology";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { GitCommitVertical, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { rpcClient } from "../rpc/client";

export function ProjectDeleteDialog({
  navigateOnDelete,
  onOpenChange,
  open,
  project,
}: {
  navigateOnDelete: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: WorkspaceAppProject;
}) {
  const { trashApp } = useTrashApp({ navigateOnDelete });
  const trashTerminology = getTrashTerminology();

  const { data: commitsData } = useQuery({
    ...rpcClient.workspace.project.git.commits.list.queryOptions({
      input: { projectSubdomain: project.subdomain },
    }),
  });

  const { data: messageCount } = useQuery(
    rpcClient.workspace.message.count.queryOptions({
      input: { subdomain: project.subdomain },
    }),
  );

  const handleDelete = async () => {
    try {
      await trashApp(project.subdomain);
    } catch {
      toast.error("Failed to delete project", {
        description:
          "Please close any external applications that might be using this folder (editors, terminals, servers, etc.) and try again.",
      });
      throw new Error("Failed to delete project");
    }
  };

  return (
    <DeleteWithProgressDialog
      content={
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
          <AppIcon name={project.iconName} size="lg" />
          <div className="flex flex-col gap-1">
            <div className="font-medium text-foreground">{project.title}</div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {commitsData?.commits && (
                <div className="flex items-center gap-1">
                  <GitCommitVertical className="size-3" />
                  <span>
                    {commitsData.commits.length}{" "}
                    {commitsData.commits.length === 1 ? "version" : "versions"}
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
            <div className="text-xs text-muted-foreground/70">
              {project.urls.localhost}
            </div>
          </div>
        </div>
      }
      description={`This project will be moved to your system ${trashTerminology}. You can restore it from there if needed.`}
      items={[project]}
      onDelete={handleDelete}
      onOpenChange={onOpenChange}
      open={open}
      title={`Delete "${project.title}" project?`}
    />
  );
}
