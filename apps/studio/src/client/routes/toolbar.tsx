import { NavControls } from "@/client/components/nav-controls";
import TabBar from "@/client/components/tab-bar";
import { Button } from "@/client/components/ui/button";
import { cn, isLinux, isMacOS, isWindows } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
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

  const { data: exceptions } = useQuery(
    rpcClient.utils.live.serverExceptions.experimental_liveOptions({}),
  );

  const hasExceptions = (exceptions?.length ?? 0) > 0;
  const isSidebarOpen = sidebarState?.isOpen ?? true;

  return (
    <div
      className="flex h-svh w-full items-end overflow-hidden bg-secondary inset-shadow-toolbar inset-shadow-(color:--border) [-webkit-app-region:drag]"
      data-testid="toolbar-page"
    >
      <header
        className={cn(
          `
            mr-2 flex
            h-svh
            w-full flex-1 items-center
          `,
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
                  openSidebar({});
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
