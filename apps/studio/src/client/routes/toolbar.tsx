import { NavControls } from "@/client/components/nav-controls";
import TabBar from "@/client/components/tab-bar";
import { Button } from "@/client/components/ui/button";
import { cn, isLinux, isMacOS, isWindows } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { SIDEBAR_WIDTH, TOOLBAR_HEIGHT } from "@/shared/constants";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { SidebarIcon } from "lucide-react";

export const Route = createFileRoute("/toolbar")({
  component: ToolbarPage,
});

function ToolbarPage() {
  const { data: sidebarState } = useQuery(
    rpcClient.sidebar.live.state.experimental_liveOptions({}),
  );

  const { mutate: openSidebar } = useMutation(
    rpcClient.sidebar.open.mutationOptions(),
  );

  const { mutate: closeSidebar } = useMutation(
    rpcClient.sidebar.close.mutationOptions(),
  );

  const { data: exceptions } = useQuery(
    rpcClient.utils.live.serverExceptions.experimental_liveOptions({}),
  );

  const hasExceptions = (exceptions?.length ?? 0) > 0;
  const isSidebarOpen = sidebarState?.isOpen ?? true;

  return (
    <div
      className="flex w-full items-end overflow-hidden [-webkit-app-region:drag]"
      data-testid="toolbar-page"
      style={{ height: `${TOOLBAR_HEIGHT}px` }}
    >
      {/* Sidebar region: transparent so the sidebar vibrancy/background shows through */}
      <div
        className={cn(
          "flex h-full shrink-0 items-center [-webkit-app-region:drag]",
          !isSidebarOpen && "hidden",
          isMacOS() ? "pl-20" : "pl-4",
        )}
        style={{ width: `${SIDEBAR_WIDTH}px` }}
      >
        <div className="flex items-center [-webkit-app-region:no-drag]">
          <Button
            className="size-6 pr-1 text-muted-foreground"
            onClick={() => {
              closeSidebar();
            }}
            size="icon"
            variant="ghost"
          >
            <SidebarIcon />
          </Button>
          <NavControls />
        </div>
      </div>
      {/* Main toolbar region: opaque background with tab bar */}
      <header
        className={cn(
          "flex h-full min-w-0 flex-1 items-center bg-secondary inset-shadow-toolbar inset-shadow-(color:--border)",
          isWindows() && "pr-36",
          isLinux() && "pr-24",
        )}
      >
        <div className="flex h-full min-w-0 flex-1 items-center">
          {!isSidebarOpen && (
            <div className="flex items-center [-webkit-app-region:no-drag]">
              <div className={cn(isMacOS() ? "ml-20" : "ml-4")} />
              <Button
                className="relative size-6 shrink-0 pr-1 text-muted-foreground"
                onClick={() => {
                  openSidebar();
                }}
                size="icon"
                title="Show sidebar"
                variant="ghost"
              >
                <SidebarIcon />
                {hasExceptions && (
                  <span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-destructive" />
                )}
              </Button>
              <NavControls />
            </div>
          )}
          <TabBar />
        </div>
      </header>
    </div>
  );
}
