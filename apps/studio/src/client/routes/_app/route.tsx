import { Toaster } from "@/client/components/ui/sonner";
import { useUpdateNotifications } from "@/client/hooks/use-update-notifications";
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
  useUpdateNotifications();

  return (
    <div className="flex h-full flex-col relative bg-background min-h-dvh">
      <Outlet />

      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <DevTools />
        </Suspense>
      )}

      <Toaster position="top-center" />
    </div>
  );
}
