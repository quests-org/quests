import { SmallAppIcon } from "@/client/components/app-icon";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/client/components/ui/command";
import { Spinner } from "@/client/components/ui/spinner";
import { useOpenProjectLauncher } from "@/client/hooks/use-open-project-launcher";
import { rpcClient } from "@/client/rpc/client";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useMatch, useNavigate } from "@tanstack/react-router";
import { Copy, LayoutGrid, Plus, SettingsIcon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";

export function ProjectLauncher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const projectRouteMatch = useMatch({
    from: "/_app/projects/$subdomain/",
    shouldThrow: false,
  });
  const newTabRouteMatch = useMatch({
    from: "/_app/new-tab",
    shouldThrow: false,
  });
  const projectsRouteMatch = useMatch({
    from: "/_app/projects/",
    shouldThrow: false,
  });

  const { data: projectsData, isLoading } = useQuery(
    rpcClient.workspace.project.list.queryOptions({
      enabled: open,
      input: { direction: "desc", sortBy: "updatedAt" },
      placeholderData: (prev) => prev,
    }),
  );

  const projects = projectsData?.projects ?? [];

  const currentProjectSubdomain = projectRouteMatch?.params.subdomain;

  const { data: currentProject } = useQuery(
    rpcClient.workspace.project.bySubdomain.queryOptions({
      input:
        open && currentProjectSubdomain
          ? { subdomain: currentProjectSubdomain }
          : skipToken,
    }),
  );
  const isOnNewTabPage = !!newTabRouteMatch;
  const isOnProjectsPage = !!projectsRouteMatch;

  useOpenProjectLauncher(
    useCallback(() => {
      setOpen((prev) => !prev);
    }, []),
  );

  const handleSelectProject = (subdomain: ProjectSubdomain) => {
    setOpen(false);
    void navigate({
      params: { subdomain },
      to: "/projects/$subdomain",
    });
  };

  const handleNewProject = () => {
    setOpen(false);
    void navigate({ to: "/new-tab" });
  };

  const handleAllProjects = () => {
    setOpen(false);
    void navigate({ to: "/projects" });
  };

  const openCurrentProjectModal = (
    searchKey: "showDelete" | "showDuplicate" | "showSettings",
  ) => {
    if (!currentProjectSubdomain) {
      return;
    }
    setOpen(false);
    void navigate({
      from: "/projects/$subdomain",
      params: { subdomain: currentProjectSubdomain },
      search: (prev) => ({ ...prev, [searchKey]: true }),
    });
  };

  return (
    <CommandDialog
      description="Search for a project to open..."
      onOpenChange={setOpen}
      open={open}
      title="Open Project"
    >
      <CommandInput placeholder="Search projects..." />
      <CommandList className="max-h-96">
        {isLoading && projects.length === 0 ? (
          <div className="flex items-center justify-center gap-x-2 py-6 text-sm text-muted-foreground">
            <Spinner />
            <span>Loading projects...</span>
          </div>
        ) : (
          <>
            <CommandEmpty>No projects found.</CommandEmpty>
            {currentProject && (
              <CommandGroup heading={currentProject.title}>
                <CommandItem
                  onSelect={() => {
                    openCurrentProjectModal("showSettings");
                  }}
                  value="current-project-settings"
                >
                  <SettingsIcon className="size-4" />
                  <span>Settings</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    openCurrentProjectModal("showDuplicate");
                  }}
                  value="current-project-duplicate"
                >
                  <Copy className="size-4" />
                  <span>Duplicate</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    openCurrentProjectModal("showDelete");
                  }}
                  value="current-project-delete"
                >
                  <TrashIcon className="size-4" />
                  <span>Delete</span>
                </CommandItem>
              </CommandGroup>
            )}
            {(!isOnNewTabPage || !isOnProjectsPage) && (
              <CommandGroup heading="Pages">
                {!isOnNewTabPage && (
                  <CommandItem onSelect={handleNewProject} value="new-project">
                    <Plus className="size-4" />
                    <span>New project</span>
                  </CommandItem>
                )}
                {!isOnProjectsPage && (
                  <CommandItem
                    onSelect={handleAllProjects}
                    value="all-projects"
                  >
                    <LayoutGrid className="size-4" />
                    <span>All projects</span>
                  </CommandItem>
                )}
              </CommandGroup>
            )}
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.subdomain}
                  keywords={[project.title]}
                  onSelect={() => {
                    handleSelectProject(project.subdomain);
                  }}
                  value={project.subdomain}
                >
                  <SmallAppIcon
                    background={project.icon?.background}
                    icon={project.icon?.lucide}
                    mode={project.mode}
                    size="sm"
                  />
                  <span className="truncate">{project.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
