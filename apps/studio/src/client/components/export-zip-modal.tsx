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
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { ProjectStatsCard } from "./project-stats-card";

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

        <ProjectStatsCard project={project} />

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
