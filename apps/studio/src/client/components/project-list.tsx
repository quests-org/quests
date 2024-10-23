import { Input } from "@/client/components/ui/input";
import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Folder, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { rpcClient } from "../rpc/client";

interface ProjectListProps {
  headerTitle?: string;
  showHeader?: boolean;
}

export function ProjectList({
  headerTitle = "Your Projects",
  showHeader = true,
}: ProjectListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: projectsData } = useQuery(
    rpcClient.workspace.project.live.list.experimental_liveOptions(),
  );

  const filteredProjects = useMemo(() => {
    if (!projectsData?.projects) {
      return [];
    }
    if (!searchQuery.trim()) {
      return projectsData.projects;
    }

    const query = searchQuery.toLowerCase();
    return projectsData.projects.filter((project) =>
      project.folderName.toLowerCase().includes(query),
    );
  }, [projectsData?.projects, searchQuery]);

  return (
    <div className="mx-auto max-w-3xl">
      {showHeader && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 pt-3 pb-6 mb-2">
          <div className="flex items-center justify-between pt-0 pb-2">
            <h2 className="text-2xl font-bold tracking-tight">{headerTitle}</h2>
            {projectsData && (
              <span className="text-sm text-muted-foreground">
                {projectsData.total} project
                {projectsData.total === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {projectsData && projectsData.projects.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                placeholder="Search projects..."
                value={searchQuery}
              />
            </div>
          )}
        </div>
      )}

      {!showHeader && projectsData && projectsData.projects.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            placeholder="Search projects..."
            value={searchQuery}
          />
        </div>
      )}

      {!projectsData || projectsData.projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
            <Folder className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            No projects yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Create your first project by describing what you want to build
            {showHeader ? " above" : ""}.
          </p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            No projects found
          </h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search terms.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProjects.map((project) => (
            <ProjectListItem key={project.subdomain} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectListItem({ project }: { project: WorkspaceAppProject }) {
  // Calculate a mock last modified date (in a real app, this would come from the API)
  const lastModified = new Date(
    Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
  );

  return (
    <Link
      className="block"
      params={{ subdomain: project.subdomain }}
      to="/projects/$subdomain"
    >
      <div className="group flex items-center space-x-4 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
          <Folder className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{project.title}</h3>
          <p className="text-sm text-muted-foreground">
            Modified {formatDistanceToNow(lastModified, { addSuffix: true })}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            Project
          </span>
        </div>
      </div>
    </Link>
  );
}
