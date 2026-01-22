import { DeleteWithProgressDialog } from "@/client/components/delete-with-progress-dialog";
import { useTrashApp } from "@/client/hooks/use-trash-app";
import { getTrashTerminology } from "@/client/lib/trash-terminology";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { toast } from "sonner";

import { ProjectStatsCard } from "./project-stats-card";

export function ProjectDeleteDialog({
  navigateOnDelete,
  onDeleteEnd,
  onDeleteStart,
  onOpenChange,
  open,
  project,
}: {
  navigateOnDelete: boolean;
  onDeleteEnd?: () => void;
  onDeleteStart?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project: WorkspaceAppProject;
}) {
  const { trashApp } = useTrashApp({ navigateOnDelete });
  const trashTerminology = getTrashTerminology();

  const handleDelete = async () => {
    try {
      onDeleteStart?.();
      await trashApp(project.subdomain);
    } catch {
      toast.error("Failed to delete project", {
        description:
          "Please close any external applications that might be using this folder (editors, terminals, servers, etc.) and try again.",
      });
      throw new Error("Failed to delete project");
    } finally {
      onDeleteEnd?.();
    }
  };

  return (
    <DeleteWithProgressDialog
      content={<ProjectStatsCard project={project} />}
      description={`This project will be moved to your system ${trashTerminology}. You can restore it from there if needed.`}
      items={[project]}
      onDelete={handleDelete}
      onOpenChange={onOpenChange}
      open={open}
      title="Delete Project?"
    />
  );
}
