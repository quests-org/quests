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
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";

export function ProjectLauncher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: projectsData, isLoading } = useQuery(
    rpcClient.workspace.project.list.queryOptions({
      enabled: open,
      input: { direction: "desc", sortBy: "updatedAt" },
      placeholderData: (prev) => prev,
    }),
  );

  const projects = projectsData?.projects ?? [];

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

  return (
    <CommandDialog
      description="Search for a project to open..."
      onOpenChange={setOpen}
      open={open}
      title="Open Project"
    >
      <CommandInput placeholder="Search projects..." />
      <CommandList>
        {isLoading && projects.length === 0 ? (
          <div className="flex items-center justify-center gap-x-2 py-6 text-sm text-muted-foreground">
            <Spinner />
            <span>Loading projects...</span>
          </div>
        ) : (
          <>
            <CommandEmpty>No projects found.</CommandEmpty>
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
