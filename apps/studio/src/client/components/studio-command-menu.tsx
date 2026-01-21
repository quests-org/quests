import { AppIcon } from "@/client/components/app-icon";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/client/components/ui/command";
import { Skeleton } from "@/client/components/ui/skeleton";
import { useTabActions } from "@/client/hooks/use-tab-actions";
import { useToggleCommandMenu } from "@/client/hooks/use-toggle-command-menu";
import { rpcClient } from "@/client/rpc/client";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useMatch, useNavigate } from "@tanstack/react-router";
import {
  format,
  formatDistanceToNow,
  isToday,
  isWithinInterval,
  isYesterday,
  startOfDay,
  subDays,
} from "date-fns";
import { Copy, LayoutGrid, Pencil, Plus, TrashIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export function StudioCommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { navigateTab } = useTabActions();
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

  const filteredProjects = projects.filter(
    (project) => project.subdomain !== currentProjectSubdomain,
  );

  const groupedProjects = useMemo(() => {
    const groups = {
      "Last 7 Days": [] as typeof filteredProjects,
      Older: [] as typeof filteredProjects,
      Today: [] as typeof filteredProjects,
      Yesterday: [] as typeof filteredProjects,
    };

    for (const project of filteredProjects) {
      const group = getDateGroup(new Date(project.updatedAt));
      groups[group].push(project);
    }

    return groups;
  }, [filteredProjects]);

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

  useToggleCommandMenu(
    useCallback(() => {
      setOpen((prev) => !prev);
    }, []),
  );

  const handleSelectProject = (subdomain: ProjectSubdomain) => {
    setOpen(false);
    void navigateTab({
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
      <CommandList className="h-96">
        {isLoading && projects.length === 0 ? (
          <div className="space-y-4 px-2 py-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div className="flex items-center gap-x-3" key={i}>
                <Skeleton className="size-8 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <CommandEmpty>
              <span className="text-muted-foreground">No commands found</span>
            </CommandEmpty>
            {currentProject && (
              <CommandGroup
                heading={
                  <div className="flex items-center gap-x-1.5">
                    <AppIcon name={currentProject.iconName} size="xs" />
                    <span className="truncate">{currentProject.title}</span>
                  </div>
                }
              >
                <CommandItem
                  onSelect={() => {
                    openCurrentProjectModal("showSettings");
                  }}
                  value="current-project-rename"
                >
                  <Pencil className="size-4" />
                  <span>Rename</span>
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
            {(["Today", "Yesterday", "Last 7 Days", "Older"] as const).map(
              (groupName) => {
                const groupProjects = groupedProjects[groupName];
                if (groupProjects.length === 0) {
                  return null;
                }

                return (
                  <CommandGroup heading={groupName} key={groupName}>
                    {groupProjects.map((project) => (
                      <CommandItem
                        key={project.subdomain}
                        keywords={[project.title]}
                        onSelect={() => {
                          handleSelectProject(project.subdomain);
                        }}
                        value={project.subdomain}
                      >
                        <AppIcon name={project.iconName} size="sm" />
                        <span className="flex-1 truncate">{project.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {groupName === "Older"
                            ? format(new Date(project.updatedAt), "MMM d, yyyy")
                            : getRelativeTime(new Date(project.updatedAt))}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              },
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

function getDateGroup(date: Date) {
  if (isToday(date)) {
    return "Today";
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  if (
    isWithinInterval(date, {
      end: new Date(),
      start: startOfDay(subDays(new Date(), 7)),
    })
  ) {
    return "Last 7 Days";
  }
  return "Older";
}

function getRelativeTime(date: Date) {
  return formatDistanceToNow(date, { addSuffix: true });
}
