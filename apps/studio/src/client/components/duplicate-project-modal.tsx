import { Button } from "@/client/components/ui/button";
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

  const duplicateMutation = useMutation(
    rpcClient.workspace.project.fork.mutationOptions({
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

        <div className="bg-muted/50 p-3 rounded-lg my-4">
          <h4 className="font-medium text-sm mb-2">What happens:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Copies all files and version history</li>
            <li>Creates independent project</li>
          </ul>
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
