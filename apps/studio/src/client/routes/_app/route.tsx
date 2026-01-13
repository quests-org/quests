import { FilePreviewModal } from "@/client/components/file-preview-modal";
import { ProjectFileViewerModal } from "@/client/components/project-file-viewer-modal";
import { Toaster } from "@/client/components/ui/sonner";
import { useInvalidateRouterOnUserChange } from "@/client/hooks/use-invalidate-router-on-user-change";
import { useUpdateNotifications } from "@/client/hooks/use-update-notifications";
import { rpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";

const StudioCommandMenu = lazy(() =>
  import("@/client/components/studio-command-menu").then((module) => ({
    default: module.StudioCommandMenu,
  })),
);

export const Route = createFileRoute("/_app")({
  component: RouteComponent,
});

const DevTools = lazy(() =>
  import("@/client/components/dev-tools").then((module) => ({
    default: module.DevTools,
  })),
);

function RouteComponent() {
  const { data: preferences } = useQuery(
    rpcClient.preferences.live.get.experimental_liveOptions(),
  );
  useUpdateNotifications();
  useInvalidateRouterOnUserChange();

  const router = useRouter();

  useEffect(() => {
    async function preloadRouteChunks() {
      try {
        const projectRoute = router.routesByPath["/projects/$subdomain"];
        await Promise.all([
          router.loadRouteChunk(projectRoute),
          router.loadRouteChunk(projectRoute.parentRoute),
        ]);
      } catch {
        // Failed to preload route chunk
      }
    }

    void preloadRouteChunks();
  }, [router]);

  return (
    <div
      className="relative flex h-full min-h-dvh flex-col bg-background"
      data-testid="app-page"
    >
      <Outlet />

      {preferences?.developerMode && (
        <Suspense fallback={null}>
          <DevTools />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <StudioCommandMenu />
      </Suspense>
      <ProjectFileViewerModal />
      <FilePreviewModal />
      <Toaster position="top-center" />
    </div>
  );
}
