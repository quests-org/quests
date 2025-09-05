import { Button } from "@/client/components/ui/button";
import { Checkbox } from "@/client/components/ui/checkbox";
import { rpcClient } from "@/client/rpc/client";
import {
  type ProjectSubdomain,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/debug/bulk-delete")({
  component: RouteComponent,
});

function RouteComponent() {
  const [selectedProjects, setSelectedProjects] = useState<
    Set<ProjectSubdomain>
  >(new Set());

  const {
    data: projectsData,
    isLoading,
    refetch,
  } = useQuery(rpcClient.workspace.project.list.queryOptions({}));

  const trashProjectMutation = useMutation(
    rpcClient.workspace.project.trash.mutationOptions(),
  );

  const projects = projectsData?.projects ?? [];

  const handleSelectAll = () => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map((p) => p.subdomain)));
    }
  };

  const handleSelectProject = (
    subdomain: ProjectSubdomain,
    checked: boolean,
  ) => {
    const newSelected = new Set(selectedProjects);
    if (checked) {
      newSelected.add(subdomain);
    } else {
      newSelected.delete(subdomain);
    }
    setSelectedProjects(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedProjects.size === 0) {
      toast.error("No projects selected");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedProjects.size} project(s)? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    const projectsToDelete = [...selectedProjects];
    let successCount = 0;
    let failCount = 0;

    for (const subdomain of projectsToDelete) {
      try {
        await trashProjectMutation.mutateAsync({ subdomain });
        successCount++;
        toast.success(`Deleted project: ${subdomain}`);
      } catch (error) {
        failCount++;
        toast.error(`Failed to delete project: ${subdomain}`);
        // eslint-disable-next-line no-console
        console.error(`Failed to delete project ${subdomain}:`, error);
      }
    }

    setSelectedProjects(new Set());
    await refetch();

    toast.success(
      `Bulk delete completed: ${successCount} successful, ${failCount} failed`,
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Bulk Delete Projects</h1>
        <p className="text-sm text-muted-foreground">
          Select projects to delete permanently. This action cannot be undone.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={
              selectedProjects.size === projects.length && projects.length > 0
            }
            id="select-all"
            onCheckedChange={handleSelectAll}
          />
          <label className="text-sm font-medium" htmlFor="select-all">
            Select All ({projects.length} projects)
          </label>
        </div>

        <Button
          disabled={
            selectedProjects.size === 0 || trashProjectMutation.isPending
          }
          onClick={handleBulkDelete}
          variant="destructive"
        >
          {trashProjectMutation.isPending
            ? "Deleting..."
            : `Delete Selected (${selectedProjects.size})`}
        </Button>
      </div>

      <div className="border rounded-lg">
        {projects.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No projects found</p>
          </div>
        ) : (
          <div className="divide-y">
            {projects.map((project: WorkspaceAppProject) => (
              <div
                className="flex items-center space-x-3 p-4 hover:bg-muted/50"
                key={project.subdomain}
              >
                <Checkbox
                  checked={selectedProjects.has(project.subdomain)}
                  id={project.subdomain}
                  onCheckedChange={(checked) => {
                    handleSelectProject(project.subdomain, checked === true);
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium truncate">
                      {project.title || "Untitled Project"}
                    </h3>
                    <span className="text-xs text-muted-foreground font-mono">
                      {project.subdomain}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {project.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
