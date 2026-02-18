import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/client/components/ui/sidebar";
import { useTabActions } from "@/client/hooks/use-tab-actions";
import { cn } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import {
  type ProjectSubdomain,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { type MakeRouteMatchUnion } from "@tanstack/react-router";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { InternalLink } from "./internal-link";
import { NavProjectItem } from "./nav-project-item";

const FAVORITES_LIMIT = 5;
const PROJECT_ITEM_HEIGHT = 36;

export function NavProjects({
  favoriteSubdomains,
  isFavorites,
  matches,
  projects,
  sortFavoritesBy = "activity",
  title,
}: {
  favoriteSubdomains: Set<string>;
  isFavorites: boolean;
  matches: MakeRouteMatchUnion[];
  projects: WorkspaceAppProject[];
  sortFavoritesBy?: "activity" | "added";
  title: string;
}) {
  const { addTab } = useTabActions();

  const handleOpenInNewTab = (subdomain: ProjectSubdomain) => {
    void addTab({
      params: { subdomain },
      to: "/projects/$subdomain",
    });
  };

  const { mutate: removeFavorite } = useMutation(
    rpcClient.favorites.remove.mutationOptions(),
  );
  const handleRemoveFavorite = (subdomain: ProjectSubdomain) => {
    removeFavorite({ subdomain });
  };

  const projectsMatch = matches.find(
    (match) => match.routeId === "/_app/projects/",
  );

  const isProjectsPage = projectsMatch !== undefined;
  const currentFilter = projectsMatch?.search.filter ?? "all";

  const isActive = isProjectsPage
    ? isFavorites
      ? currentFilter === "favorites"
      : currentFilter === "all"
    : false;

  const visibleFavorites = isFavorites
    ? sortFavoritesBy === "activity"
      ? projects.slice(0, FAVORITES_LIMIT)
      : projects.slice(-FAVORITES_LIMIT)
    : projects;

  const hasMoreFavorites = isFavorites && projects.length > FAVORITES_LIMIT;

  const isProjectActive = (subdomain: string) =>
    matches.some(
      (match) =>
        match.routeId === "/_app/projects/$subdomain/" &&
        match.params.subdomain === subdomain,
    );

  return (
    <SidebarGroup className="pr-0.5 pl-1 group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel
        asChild
        className={cn(isActive && "text-sidebar-foreground/90")}
      >
        <InternalLink
          openInCurrentTab
          search={{ filter: isFavorites ? "favorites" : "all" }}
          to="/projects"
        >
          {title}
        </InternalLink>
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0">
        {isFavorites ? (
          <>
            {visibleFavorites.map((project) => (
              <NavProjectItem
                isActive={isProjectActive(project.subdomain)}
                isFavorited={favoriteSubdomains.has(project.subdomain)}
                isFavorites
                key={project.subdomain}
                onOpenInNewTab={handleOpenInNewTab}
                onRemoveFavorite={handleRemoveFavorite}
                project={project}
              />
            ))}
            {hasMoreFavorites && (
              <li className="px-2 pt-0.5 pb-1">
                <InternalLink
                  className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
                  openInCurrentTab
                  search={{ filter: "favorites" }}
                  to="/projects"
                >
                  View all favorites
                  <ChevronRight className="size-3" />
                </InternalLink>
              </li>
            )}
          </>
        ) : (
          <ProjectsList
            favoriteSubdomains={favoriteSubdomains}
            matches={matches}
            onOpenInNewTab={handleOpenInNewTab}
            projects={projects}
          />
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function ProjectsList({
  favoriteSubdomains,
  matches,
  onOpenInNewTab,
  projects,
}: {
  favoriteSubdomains: Set<string>;
  matches: MakeRouteMatchUnion[];
  onOpenInNewTab: (subdomain: ProjectSubdomain) => void;
  projects: WorkspaceAppProject[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scroller = container.closest("[data-sidebar='content']");
    setScrollElement(scroller instanceof HTMLElement ? scroller : null);

    const observer = new ResizeObserver(() => {
      const scrollerRect = scroller?.getBoundingClientRect();
      setScrollMargin(
        container.getBoundingClientRect().top -
          (scrollerRect?.top ?? 0) +
          (scroller?.scrollTop ?? 0),
      );
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, []);

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: projects.length,
    estimateSize: () => PROJECT_ITEM_HEIGHT,
    getScrollElement: () => scrollElement,
    overscan: 5,
    scrollMargin,
  });

  const projectStates = useMemo(
    () =>
      projects.map((project) => ({
        isActive: matches.some(
          (match) =>
            match.routeId === "/_app/projects/$subdomain/" &&
            match.params.subdomain === project.subdomain,
        ),
        isFavorited: favoriteSubdomains.has(project.subdomain),
        subdomain: project.subdomain,
      })),
    [projects, matches, favoriteSubdomains],
  );

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={containerRef}
      style={{ height: virtualizer.getTotalSize(), position: "relative" }}
    >
      {virtualItems.map((virtualItem) => {
        const project = projects[virtualItem.index];
        const state = projectStates[virtualItem.index];
        if (!project || !state) {
          return null;
        }
        return (
          <div
            key={virtualItem.key}
            style={{
              height: PROJECT_ITEM_HEIGHT,
              left: 0,
              position: "absolute",
              top: 0,
              transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
              width: "100%",
            }}
          >
            <NavProjectItem
              isActive={state.isActive}
              isFavorited={state.isFavorited}
              isFavorites={false}
              onOpenInNewTab={onOpenInNewTab}
              project={project}
            />
          </div>
        );
      })}
    </div>
  );
}
