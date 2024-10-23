import { type WorkspaceAppProject } from "@quests/workspace/client";
import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

export function useProjectRouteSync(project?: WorkspaceAppProject) {
  const router = useRouter();

  useEffect(() => {
    if (!project) {
      return;
    }
    void router.invalidate({
      filter: (m) =>
        (m.routeId === "/_app/projects/$subdomain/" &&
          m.params.subdomain === project.subdomain) ||
        (m.routeId === "/_app/projects/$subdomain/view" &&
          m.params.subdomain === project.subdomain),
    });
  }, [router, project]);
}
