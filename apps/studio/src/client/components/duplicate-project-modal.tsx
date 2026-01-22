import { ProjectStatsCard } from "@/client/components/project-stats-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/client/components/ui/alert-dialog";
import { Button } from "@/client/components/ui/button";
import { useTabActions } from "@/client/hooks/use-tab-actions";
import { rpcClient } from "@/client/rpc/client";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface DuplicateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: WorkspaceAppProject;
}

export function DuplicateProjectModal({
  isOpen,
  onClose,
  project,
}: DuplicateProjectModalProps) {
  const { addTab } = useTabActions();

  const duplicateMutation = useMutation(
    rpcClient.workspace.project.duplicate.mutationOptions({
      onError: (error: Error) => {
        toast.error("Failed to duplicate project", {
          description: error.message,
        });
      },
      onSuccess: (duplicatedProject) => {
        onClose();

        void addTab({
          params: { subdomain: duplicatedProject.subdomain },
          to: "/projects/$subdomain",
        });
      },
    }),
  );

  const handleDuplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    duplicateMutation.mutate({
      keepHistory: true,
      sourceSubdomain: project.subdomain,
    });
  };

  return (
    <AlertDialog onOpenChange={onClose} open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Duplicate Project?</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a copy of the project with all of its messages and
            files as a new project.
          </AlertDialogDescription>
          <ProjectStatsCard project={project} />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              disabled={duplicateMutation.isPending}
              onClick={handleDuplicate}
            >
              {duplicateMutation.isPending
                ? "Duplicating..."
                : "Duplicate project"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
