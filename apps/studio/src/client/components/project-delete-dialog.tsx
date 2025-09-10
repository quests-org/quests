import { Button } from "@/client/components/ui/button";
import { useTrashApp } from "@/client/hooks/use-trash-app";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { toast } from "sonner";

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
  const { isPending, trashApp } = useTrashApp({ navigateOnDelete: true });

  const handleDelete = async () => {
    try {
      await trashApp(project.subdomain);
      onOpenChange(false);
    } catch {
      toast.error("Failed to delete project");
    }
  };

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete <b>{project.title}</b>?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will move the &ldquo;<b>{project.title}</b>&rdquo; project to
            the trash.
          </AlertDialogDescription>
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
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
