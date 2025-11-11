import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

// Ensures TanStack Router re-renders meta tags so the tab title and icon are updated
export function useProjectRouteSync(project?: WorkspaceAppProject) {
  const router = useRouter();

  useEffect(() => {
    if (!project) {
      return;
    }
    void router.invalidate({
      filter: (m) =>
        m.routeId === "/_app/projects/$subdomain/" &&
        m.params.subdomain === project.subdomain,
    });
  }, [router, project]);
}
