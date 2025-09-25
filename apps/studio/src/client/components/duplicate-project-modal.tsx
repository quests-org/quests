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
import { rpcClient } from "@/client/rpc/client";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

interface DuplicateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  projectSubdomain: ProjectSubdomain;
}

export function DuplicateProjectModal({
  isOpen,
  onClose,
  projectName,
  projectSubdomain,
}: DuplicateProjectModalProps) {
  const navigate = useNavigate();
  const [keepHistory, setKeepHistory] = useState(true);

  const duplicateMutation = useMutation(
    rpcClient.workspace.project.duplicate.mutationOptions({
      onError: (error: Error) => {
        toast.error("Failed to duplicate project", {
          description: error.message,
        });
      },
      onSuccess: (duplicatedProject) => {
        toast.success("Project duplicated successfully", {
          description: `From "${projectName}"`,
        });
        onClose();
        void navigate({
          params: { subdomain: duplicatedProject.subdomain },
          to: "/projects/$subdomain",
        });
      },
    }),
  );

  const handleDuplicate = () => {
    duplicateMutation.mutate({
      keepHistory,
      sourceSubdomain: projectSubdomain,
    });
  };

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Duplicate Project</DialogTitle>
          <DialogDescription className="text-left">
            This will create a copy of &ldquo;{projectName}&rdquo; as a new
            project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2">
          <Checkbox
            checked={keepHistory}
            id="keep-history"
            onCheckedChange={(checked) => {
              setKeepHistory(checked === true);
            }}
          />
          <label
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            htmlFor="keep-history"
          >
            Keep chat and version history
          </label>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            disabled={duplicateMutation.isPending}
            onClick={handleDuplicate}
          >
            {duplicateMutation.isPending
              ? "Duplicating..."
              : "Duplicate Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
