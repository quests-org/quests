import { Toaster } from "@/client/components/ui/sonner";
import { useServerExceptionNotifications } from "@/client/hooks/use-server-exception-notifications";
import { useUserSessionNotifications } from "@/client/hooks/use-user-session-notifications";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

export const Route = createFileRoute("/_app")({
  component: RouteComponent,
});

const DebugMenu = lazy(() =>
  import("@/client/components/debug-menu").then((module) => ({
    default: module.DebugMenu,
  })),
);

function RouteComponent() {
  useUserSessionNotifications();
  useServerExceptionNotifications();

  return (
    <div className="flex h-full flex-col relative bg-background">
      <Outlet />

      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <DebugMenu />
        </Suspense>
      )}

      <Toaster position="top-center" />
    </div>
  );
}
