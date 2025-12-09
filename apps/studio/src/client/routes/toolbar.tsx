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
  const { data: sidebarVisibility } = useQuery(
    rpcClient.sidebar.live.visibility.experimental_liveOptions({}),
  );

  const { mutate: openSidebar } = useMutation(
    rpcClient.sidebar.open.mutationOptions(),
  );

  const { data: exceptions } = useQuery(
    rpcClient.utils.live.serverExceptions.experimental_liveOptions({}),
  );

  const hasExceptions = (exceptions?.length ?? 0) > 0;
  const isSidebarVisible = sidebarVisibility?.visible ?? true;

  return (
    <div className="h-svh w-full flex items-end inset-shadow-toolbar inset-shadow-(color:--border) bg-secondary [-webkit-app-region:drag] overflow-hidden">
      <header
        className={cn(
          `
            flex items-center
            mr-2
            w-full flex-1 h-svh
          `,
          isWindows() && "pr-36",
          isLinux() && "pr-24",
        )}
      >
        <div className="flex items-center min-w-0 flex-1 h-full">
          {!isSidebarVisible && (
            <div className="flex items-center [-webkit-app-region:no-drag]">
              <div className={cn(isMacOS() ? "ml-20" : "ml-4")} />
              <Button
                className="shrink-0 size-6 pr-1 text-muted-foreground relative"
                onClick={() => {
                  openSidebar({});
                }}
                size="icon"
                title="Show sidebar"
                variant="ghost"
              >
                <SidebarIcon />
                {hasExceptions && (
                  <span className="absolute top-0.5 right-0.5 size-2 bg-destructive rounded-full" />
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
