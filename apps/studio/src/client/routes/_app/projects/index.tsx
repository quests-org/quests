import type { RowSelectionState } from "@tanstack/react-table";

import { CommandMenuCTA } from "@/client/components/command-menu-cta";
import { DeleteWithProgressDialog } from "@/client/components/delete-with-progress-dialog";
import { InternalLink } from "@/client/components/internal-link";
import { ProjectDeleteDialog } from "@/client/components/project-delete-dialog";
import { ProjectSettingsDialog } from "@/client/components/project-settings-dialog";
import {
  PROJECTS_PAGE_SIZE,
  ProjectsDataTable,
} from "@/client/components/projects-data-table";
import { createColumns } from "@/client/components/projects-data-table/columns";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/client/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { useTabActions } from "@/client/hooks/use-tab-actions";
import { useTrashApp } from "@/client/hooks/use-trash-app";
import { captureClientEvent } from "@/client/lib/capture-client-event";
import { getTrashTerminology } from "@/client/lib/trash-terminology";
import { rpcClient } from "@/client/rpc/client";
import { createIconMeta } from "@/shared/tabs";
import { EVAL_SUBDOMAIN_PREFIX } from "@quests/shared";
import {
  isProjectSubdomain,
  type ProjectSubdomain,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Circle, Loader2, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const projectsSearchSchema = z.object({
  filter: z
    .enum(["all", "evals", "active", "favorites"])
    .optional()
    .default("all"),
  page: z.coerce.number().int().positive().optional().default(1),
});

export const Route = createFileRoute("/_app/projects/")({
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        {
          title: "Your Projects",
        },
        createIconMeta("table-properties"),
      ],
    };
  },
  validateSearch: projectsSearchSchema,
});

function RouteComponent() {
  const { addTab } = useTabActions();
  const router = useRouter();
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
      return new Set<ProjectSubdomain>();
    }
    return new Set(favoriteProjects.map((p) => p.subdomain));
  }, [favoriteProjects]);

  const activeProjectSubdomains = useMemo(() => {
    if (!appStates) {
      return new Set<ProjectSubdomain>();
    }
    return new Set<ProjectSubdomain>(
      appStates
        .filter((state) => state.sessionActors.length > 0)
        .map((state) => state.app.subdomain)
        .filter((subdomain) => isProjectSubdomain(subdomain)),
    );
  }, [appStates]);

  const evalsCount = useMemo(
    () =>
      projects.filter((p) => p.subdomain.startsWith(EVAL_SUBDOMAIN_PREFIX))
        .length,
    [projects],
  );

  const filteredProjects = useMemo(() => {
    switch (filterTab) {
      case "active": {
        return projects.filter((p) => activeProjectSubdomains.has(p.subdomain));
      }
      case "evals": {
        return projects.filter((p) =>
          p.subdomain.startsWith(EVAL_SUBDOMAIN_PREFIX),
        );
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
      .map((subdomain) => {
        return projects.find((p) => p.subdomain === subdomain);
      })
      .filter((p): p is WorkspaceAppProject => p !== undefined);
  }, [projects, rowSelection]);

  const hasRunningAgents = useMemo(() => {
    if (!appStates || selectedProjects.length === 0) {
      return false;
    }
    const selectedSubdomains = new Set<ProjectSubdomain>(
      selectedProjects.map((p) => p.subdomain),
    );
    return appStates.some(
      (state) =>
        isProjectSubdomain(state.app.subdomain) &&
        selectedSubdomains.has(state.app.subdomain) &&
        state.sessionActors.some((actor) => actor.tags.includes("agent.alive")),
    );
  }, [appStates, selectedProjects]);

  const stopSessionMutation = useMutation(
    rpcClient.workspace.session.stop.mutationOptions(),
  );

  const { trashApp } = useTrashApp({ navigateOnDelete: false });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const importProjectMutation = useMutation(
    rpcClient.workspace.project.import.mutationOptions(),
  );

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.addEventListener("load", () => {
        const dataUrl = reader.result;
        if (typeof dataUrl !== "string") {
          toast.error("Failed to read file");
          return;
        }
        const base64 = dataUrl.split(",")[1] ?? "";

        importProjectMutation.mutate(
          { zipFileData: base64 },
          {
            onError: (error) => {
              toast.error("Failed to import project", {
                description: error.message,
              });
            },
            onSuccess: (data) => {
              toast.success("Project imported successfully");
              void router.navigate({
                params: { subdomain: data.subdomain },
                to: "/projects/$subdomain",
              });
            },
          },
        );
      });
      reader.readAsDataURL(file);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [importProjectMutation, router],
  );

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
      void addTab(
        {
          params: { subdomain },
          to: "/projects/$subdomain",
        },
        { select: true },
      );
    },
    [addTab],
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

  useEffect(() => {
    // Ensures we stay on a valid page when filtered projects change
    const maxPage = Math.max(
      1,
      Math.ceil(filteredProjects.length / PROJECTS_PAGE_SIZE),
    );

    if (search.page > maxPage) {
      void navigate({ replace: true, search: { ...search, page: maxPage } });
    }
  }, [filteredProjects.length, navigate, search]);

  return (
    <div className="mx-auto w-full max-w-7xl flex-1">
      <div>
        <div className="mx-auto px-4 pt-10 sm:px-6 lg:px-8 lg:pt-20 lg:pb-4">
          <div className="flex flex-col items-center gap-y-4 text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Your Projects
            </h1>
            <CommandMenuCTA />
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
                  <Badge
                    className="ml-2 px-1.5"
                    variant={filterTab === "all" ? "default" : "secondary"}
                  >
                    {projects.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="evals">
                  Evals
                  <Badge
                    className="ml-2 px-1.5"
                    variant={filterTab === "evals" ? "default" : "secondary"}
                  >
                    {evalsCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="active">
                  Active
                  <Badge
                    className="ml-2 px-1.5"
                    variant={filterTab === "active" ? "default" : "secondary"}
                  >
                    {activeProjectSubdomains.size}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="favorites">
                  Favorites
                  <Badge
                    className="ml-2 px-1.5"
                    variant={
                      filterTab === "favorites" ? "default" : "secondary"
                    }
                  >
                    {favoriteProjectSubdomains.size}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    disabled={importProjectMutation.isPending}
                    onClick={handleImport}
                    size="sm"
                    variant="secondary"
                  >
                    Import project
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Select a zip file exported from Quests containing a
                  quests.json file
                </TooltipContent>
              </Tooltip>
              <input
                accept=".zip"
                className="hidden"
                onChange={handleFileSelect}
                ref={fileInputRef}
                type="file"
              />
              <Button asChild size="sm">
                <InternalLink to="/new-tab">New project</InternalLink>
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : isBulkDeleting ? (
            <div className="flex flex-col items-center justify-center gap-y-4 rounded-md border bg-muted/20 py-12">
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
                      <Square className="absolute inset-0 m-auto size-1.5 fill-current" />
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
              onPageChange={(page) => {
                void navigate({ replace: true, search: { ...search, page } });
              }}
              onRowSelectionChange={setRowSelection}
              page={search.page}
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
