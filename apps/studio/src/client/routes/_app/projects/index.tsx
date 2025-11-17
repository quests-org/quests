import type {
  ProjectSubdomain,
  WorkspaceAppProject,
} from "@quests/workspace/client";
import type { RowSelectionState } from "@tanstack/react-table";

import { DeleteWithProgressDialog } from "@/client/components/delete-with-progress-dialog";
import { InternalLink } from "@/client/components/internal-link";
import { ProjectDeleteDialog } from "@/client/components/project-delete-dialog";
import { ProjectSettingsDialog } from "@/client/components/project-settings-dialog";
import { ProjectsDataTable } from "@/client/components/projects-data-table";
import { createColumns } from "@/client/components/projects-data-table/columns";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import { useTabActions } from "@/client/hooks/tabs";
import { useTrashApp } from "@/client/hooks/use-trash-app";
import { captureClientEvent } from "@/client/lib/capture-client-event";
import { getTrashTerminology } from "@/client/lib/trash-terminology";
import { rpcClient } from "@/client/rpc/client";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Circle, Loader2, Square, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const projectsSearchSchema = z.object({
  filter: z
    .enum(["all", "apps", "chats", "evals", "active", "favorites"])
    .optional()
    .default("all"),
});

export const Route = createFileRoute("/_app/projects/")({
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        {
          title: "Your Projects",
        },
        {
          content: "layout-grid",
          name: META_TAG_LUCIDE_ICON,
        },
      ],
    };
  },
  validateSearch: projectsSearchSchema,
});

function RouteComponent() {
  const router = useRouter();
  const { addTab } = useTabActions();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [deleteSelectedDialogOpen, setDeleteSelectedDialogOpen] =
    useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] =
    useState<null | WorkspaceAppProject>(null);
  const [projectToEdit, setProjectToEdit] =
    useState<null | WorkspaceAppProject>(null);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const filterTab = search.filter;
  const trashTerminology = getTrashTerminology();

  const { data: projectsData, isLoading } = useQuery(
    rpcClient.workspace.project.live.list.experimental_liveOptions({
      input: { direction: "desc", sortBy: "updatedAt" },
    }),
  );

  const projects = useMemo(
    () => projectsData?.projects ?? [],
    [projectsData?.projects],
  );

  const projectSubdomains = useMemo(
    () => projects.map((p) => p.subdomain),
    [projects],
  );

  const { data: appStates } = useQuery(
    rpcClient.workspace.app.state.bySubdomains.queryOptions({
      input: { subdomains: projectSubdomains },
    }),
  );

  const { data: favoriteProjects } = useQuery(
    rpcClient.favorites.live.listProjects.experimental_liveOptions(),
  );

  const favoriteProjectSubdomains = useMemo(() => {
    if (!favoriteProjects) {
      return new Set<string>();
    }
    return new Set(favoriteProjects.map((p) => p.subdomain));
  }, [favoriteProjects]);

  const activeProjectSubdomains = useMemo(() => {
    if (!appStates) {
      return new Set();
    }
    return new Set(
      appStates
        .filter((state) => state.sessionActors.length > 0)
        .map((state) => state.app.subdomain as ProjectSubdomain),
    );
  }, [appStates]);

  const appsCount = useMemo(
    () => projects.filter((p) => p.mode === "app-builder").length,
    [projects],
  );

  const chatsCount = useMemo(
    () => projects.filter((p) => p.mode === "chat").length,
    [projects],
  );

  const evalsCount = useMemo(
    () => projects.filter((p) => p.mode === "eval").length,
    [projects],
  );

  const filteredProjects = useMemo(() => {
    switch (filterTab) {
      case "active": {
        return projects.filter((p) => activeProjectSubdomains.has(p.subdomain));
      }
      case "apps": {
        return projects.filter((p) => p.mode === "app-builder");
      }
      case "chats": {
        return projects.filter((p) => p.mode === "chat");
      }
      case "evals": {
        return projects.filter((p) => p.mode === "eval");
      }
      case "favorites": {
        return projects.filter((p) =>
          favoriteProjectSubdomains.has(p.subdomain),
        );
      }
      default: {
        return projects;
      }
    }
  }, [activeProjectSubdomains, favoriteProjectSubdomains, filterTab, projects]);

  const selectedProjects = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((key) => {
        const index = Number.parseInt(key);
        return filteredProjects[index];
      })
      .filter((p): p is WorkspaceAppProject => p !== undefined);
  }, [rowSelection, filteredProjects]);

  const hasRunningAgents = useMemo(() => {
    if (!appStates || selectedProjects.length === 0) {
      return false;
    }
    const selectedSubdomains = new Set(
      selectedProjects.map((p) => p.subdomain),
    );
    return appStates.some(
      (state) =>
        selectedSubdomains.has(state.app.subdomain as ProjectSubdomain) &&
        state.sessionActors.some((actor) => actor.tags.includes("agent.alive")),
    );
  }, [appStates, selectedProjects]);

  const stopSessionMutation = useMutation(
    rpcClient.workspace.session.stop.mutationOptions(),
  );

  const { trashApp } = useTrashApp({ navigateOnDelete: false });

  const handleStop = useCallback(
    (subdomain: ProjectSubdomain) => {
      stopSessionMutation.mutate(
        { subdomain },
        {
          onError: () => {
            toast.error("Failed to stop session");
          },
        },
      );
    },
    [stopSessionMutation],
  );

  const handleStopSelected = async () => {
    const subdomainsToStop = selectedProjects.map((p) => p.subdomain);

    let successCount = 0;
    for (const subdomain of subdomainsToStop) {
      try {
        await stopSessionMutation.mutateAsync({ subdomain });
        successCount++;
      } catch {
        toast.error(`Failed to stop session for ${subdomain}`);
      }
    }

    if (successCount > 0) {
      toast.success(
        `Stopped ${successCount} ${successCount === 1 ? "session" : "sessions"}`,
      );
      captureClientEvent("project.bulk_stopped", {
        project_count: successCount,
      });
    }
  };

  const handleDelete = useCallback(
    (subdomain: ProjectSubdomain) => {
      const project = projects.find((p) => p.subdomain === subdomain);
      if (project) {
        setProjectToDelete(project);
        setDeleteDialogOpen(true);
      }
    },
    [projects],
  );

  const handleDeleteSelected = () => {
    setDeleteSelectedDialogOpen(true);
  };

  const confirmDeleteSelected = async (
    projectsToDelete: WorkspaceAppProject[],
  ) => {
    setIsBulkDeleting(true);
    let successCount = 0;
    let hasError = false;

    try {
      for (const project of projectsToDelete) {
        try {
          await trashApp(project.subdomain);
          successCount++;
        } catch {
          toast.error(`Failed to delete project ${project.title}`);
          hasError = true;
        }
      }

      if (successCount > 0) {
        toast.success(
          `Moved ${successCount} ${successCount === 1 ? "project" : "projects"} to ${trashTerminology}`,
        );
        captureClientEvent("project.bulk_deleted", {
          project_count: successCount,
        });
      }
      setRowSelection({});

      if (hasError) {
        throw new Error("Some projects failed to delete");
      }
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleOpenInNewTab = useCallback(
    (subdomain: ProjectSubdomain) => {
      const location = router.buildLocation({
        params: { subdomain },
        to: "/projects/$subdomain",
      });
      void addTab({ select: true, urlPath: location.href });
    },
    [addTab, router],
  );

  const handleSettings = useCallback(
    (subdomain: ProjectSubdomain) => {
      const project = projects.find((p) => p.subdomain === subdomain);
      if (project) {
        setProjectToEdit(project);
        setSettingsDialogOpen(true);
      }
    },
    [projects],
  );

  const columns = useMemo(
    () =>
      createColumns({
        favoriteProjectSubdomains,
        onDelete: handleDelete,
        onOpenInNewTab: handleOpenInNewTab,
        onSettings: handleSettings,
        onStop: handleStop,
      }),
    [
      favoriteProjectSubdomains,
      handleDelete,
      handleOpenInNewTab,
      handleSettings,
      handleStop,
    ],
  );

  return (
    <div className="flex-1 mx-auto max-w-7xl w-full">
      <div>
        <div className="mx-auto px-4 pt-10 lg:pt-20 lg:pb-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Your Projects
            </h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-y-4">
          <div className="flex items-center justify-between">
            <Tabs
              onValueChange={(v) => {
                const filter = projectsSearchSchema.parse({ filter: v });
                void navigate({ search: filter });
              }}
              value={filterTab}
            >
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <Badge className="ml-2 px-1.5" variant="secondary">
                    {projects.length}
                  </Badge>
                </TabsTrigger>
                {appsCount > 0 && (
                  <TabsTrigger value="apps">
                    Apps
                    <Badge className="ml-2 px-1.5" variant="secondary">
                      {appsCount}
                    </Badge>
                  </TabsTrigger>
                )}
                {chatsCount > 0 && (
                  <TabsTrigger value="chats">
                    Chats
                    <Badge className="ml-2 px-1.5" variant="secondary">
                      {chatsCount}
                    </Badge>
                  </TabsTrigger>
                )}
                {evalsCount > 0 && (
                  <TabsTrigger value="evals">
                    Evals
                    <Badge className="ml-2 px-1.5" variant="secondary">
                      {evalsCount}
                    </Badge>
                  </TabsTrigger>
                )}
                {activeProjectSubdomains.size > 0 && (
                  <TabsTrigger value="active">
                    Active
                    <Badge className="ml-2 px-1.5" variant="secondary">
                      {activeProjectSubdomains.size}
                    </Badge>
                  </TabsTrigger>
                )}
                {favoriteProjectSubdomains.size > 0 && (
                  <TabsTrigger value="favorites">
                    Favorites
                    <Badge className="ml-2 px-1.5" variant="secondary">
                      {favoriteProjectSubdomains.size}
                    </Badge>
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
            <Button asChild size="sm">
              <InternalLink to="/new-tab">New project</InternalLink>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : isBulkDeleting ? (
            <div className="flex flex-col items-center justify-center gap-y-4 py-12 rounded-md border bg-muted/20">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                Deleting {selectedProjects.length}{" "}
                {selectedProjects.length === 1 ? "project" : "projects"}...
              </div>
            </div>
          ) : (
            <ProjectsDataTable
              bulkActions={
                <>
                  <Button
                    disabled={!hasRunningAgents}
                    onClick={handleStopSelected}
                    size="sm"
                    variant="outline"
                  >
                    <div className="relative flex items-center justify-center">
                      <Circle className="size-4" />
                      <Square className="size-1.5 fill-current absolute inset-0 m-auto" />
                    </div>
                    Stop
                  </Button>
                  <Button
                    disabled={selectedProjects.length === 0}
                    onClick={handleDeleteSelected}
                    size="sm"
                    variant="outline"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </>
              }
              columns={columns}
              data={filteredProjects}
              onRowSelectionChange={setRowSelection}
              rowSelection={rowSelection}
            />
          )}
        </div>
      </div>

      <DeleteWithProgressDialog
        description={`${selectedProjects.length === 1 ? "This project" : "These projects"} will be moved to your system ${trashTerminology}.`}
        items={selectedProjects}
        onDelete={confirmDeleteSelected}
        onOpenChange={setDeleteSelectedDialogOpen}
        open={deleteSelectedDialogOpen}
        title={`Move ${selectedProjects.length} ${selectedProjects.length === 1 ? "project" : "projects"} to ${trashTerminology}?`}
      />

      {projectToDelete && (
        <ProjectDeleteDialog
          navigateOnDelete={false}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) {
              setProjectToDelete(null);
            }
          }}
          open={deleteDialogOpen}
          project={projectToDelete}
        />
      )}

      {projectToEdit && (
        <ProjectSettingsDialog
          onOpenChange={(open) => {
            setSettingsDialogOpen(open);
            if (!open) {
              setProjectToEdit(null);
            }
          }}
          open={settingsDialogOpen}
          project={projectToEdit}
        />
      )}
    </div>
  );
}
