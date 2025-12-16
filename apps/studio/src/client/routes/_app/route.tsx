import { FileViewerModal } from "@/client/components/file-viewer-modal";
import { Toaster } from "@/client/components/ui/sonner";
import { useInvalidateRouterOnUserChange } from "@/client/hooks/use-invalidate-router-on-user-change";
import { useUpdateNotifications } from "@/client/hooks/use-update-notifications";
import { rpcClient } from "@/client/rpc/client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

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
    <div className="flex h-full flex-col relative bg-background min-h-dvh">
      <Outlet />

      {preferences?.developerMode && (
        <Suspense fallback={null}>
          <DevTools />
        </Suspense>
      )}

      <FileViewerModal />
      <Toaster position="top-center" />
    </div>
  );
}
