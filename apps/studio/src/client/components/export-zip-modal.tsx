import { Button } from "@/client/components/ui/button";
import { Checkbox } from "@/client/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { isMacOS } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

interface ExportZipModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectSubdomain: ProjectSubdomain;
}

export function ExportZipModal({
  isOpen,
  onClose,
  projectName,
  projectSubdomain,
}: ExportZipModalProps) {
  const [includeChat, setIncludeChat] = useState(false);

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
            label: isMacOS() ? "Reveal in Finder" : "Open in File Explorer",
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
      includeChat,
      subdomain: projectSubdomain,
    });
  };

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Project</DialogTitle>
          <DialogDescription className="text-left">
            {`Export "${projectName}" as a zip file to your Downloads folder.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2">
          <Checkbox
            checked={includeChat}
            id="include-chat"
            onCheckedChange={(checked) => {
              setIncludeChat(checked === true);
            }}
          />
          <label
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor="include-chat"
          >
            Include chat history
          </label>
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
