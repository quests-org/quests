import { SmallAppIcon } from "@/client/components/app-icon";
import { Button } from "@/client/components/ui/button";
import { useTrashApp } from "@/client/hooks/use-trash-app";
import { isWindows } from "@/client/lib/utils";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { GitCommitVertical, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { rpcClient } from "../rpc/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface ProjectDeleteDialogBodyProps {
  onDelete: () => void;
  project: WorkspaceAppProject;
}

interface ProjectDeleteDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: WorkspaceAppProject;
}

export function ProjectDeleteDialog({
  onOpenChange,
  open,
  project,
}: ProjectDeleteDialogProps) {
  const handleDelete = () => {
    onOpenChange(false);
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        {open && (
          // Avoids stale data in the dialog by only rendering when the dialog is open
          <ProjectDeleteDialogBody onDelete={handleDelete} project={project} />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ProjectDeleteDialogBody({
  onDelete,
  project,
}: ProjectDeleteDialogBodyProps) {
  const { isPending, trashApp } = useTrashApp({ navigateOnDelete: true });
  const trashTerminology = isWindows() ? "Recycle Bin" : "Trash";

  const { data: commitsData } = useQuery(
    rpcClient.workspace.project.git.commits.list.queryOptions({
      input: { projectSubdomain: project.subdomain },
    }),
  );

  const { data: messageCount } = useQuery(
    rpcClient.workspace.message.count.queryOptions({
      input: { subdomain: project.subdomain },
    }),
  );

  const handleDelete = async () => {
    try {
      await trashApp(project.subdomain);
      onDelete();
    } catch {
      toast.error("Failed to delete project");
    }
  };

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>
          Delete &ldquo;{project.title}&rdquo; project?
        </AlertDialogTitle>
        <AlertDialogDescription>
          This project will be moved to your system {trashTerminology}. You can
          restore it from there if needed.
        </AlertDialogDescription>
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
          <SmallAppIcon
            background={project.icon?.background}
            icon={project.icon?.lucide}
            size="lg"
          />
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
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          asChild
          className="text-white"
          disabled={isPending}
          onClick={handleDelete}
        >
          <Button variant="destructive">
            {isPending
              ? `Moving to ${trashTerminology}...`
              : `Move to ${trashTerminology}`}
          </Button>
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
