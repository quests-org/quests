import { FilePreviewModal } from "@/client/components/file-preview-modal";
import { ProjectFileViewerModal } from "@/client/components/project-file-viewer-modal";
import { Toaster } from "@/client/components/ui/sonner";
import { useInvalidateRouterOnUserChange } from "@/client/hooks/use-invalidate-router-on-user-change";
import { useUpdateNotifications } from "@/client/hooks/use-update-notifications";
import { rpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const ProjectLauncher = lazy(() =>
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

  return (
    <div className="relative flex h-full min-h-dvh flex-col bg-background">
      <Outlet />

      {preferences?.developerMode && (
        <Suspense fallback={null}>
          <DevTools />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <ProjectLauncher />
      </Suspense>
      <ProjectFileViewerModal />
      <FilePreviewModal />
      <Toaster position="top-center" />
    </div>
  );
}
