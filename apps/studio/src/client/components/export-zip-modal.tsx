import { AppIcon } from "@/client/components/app-icon";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { getRevealInFolderLabel } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { GitCommitVertical, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface ExportZipModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: WorkspaceAppProject;
}

export function ExportZipModal({
  isOpen,
  onClose,
  project,
}: ExportZipModalProps) {
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

  const showFileInFolderMutation = useMutation(
    rpcClient.utils.showFileInFolder.mutationOptions(),
  );

  const exportZipMutation = useMutation(
    rpcClient.utils.exportZip.mutationOptions({
      onError: (error: Error) => {
        toast.error("Failed to export project", {
          description: error.message,
        });
      },
      onSuccess: (result) => {
        toast.success("Project exported to Downloads", {
          action: {
            label: getRevealInFolderLabel(),
            onClick: () => {
              showFileInFolderMutation.mutate({
                filepath: result.filepath,
              });
            },
          },
          closeButton: true,
          dismissible: true,
        });
        onClose();
      },
    }),
  );

  const handleExport = () => {
    exportZipMutation.mutate({
      subdomain: project.subdomain,
    });
  };

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Project</DialogTitle>
          <DialogDescription className="text-left">
            The export will include:
          </DialogDescription>
        </DialogHeader>

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

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button disabled={exportZipMutation.isPending} onClick={handleExport}>
            {exportZipMutation.isPending ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
