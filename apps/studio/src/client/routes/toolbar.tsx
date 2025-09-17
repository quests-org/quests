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
          isWindows() && "pr-[9rem]",
          isLinux() && "pr-[6rem]",
        )}
      >
        <div className="flex items-center min-w-0 flex-1 [-webkit-app-region:no-drag] h-full pt-1">
          {!isSidebarVisible && (
            <>
              <div className={cn(isMacOS() ? "ml-20" : "ml-4")} />
              <Button
                className="shrink-0 size-6 pr-1 text-muted-foreground"
                onClick={() => {
                  openSidebar({});
                }}
                size="icon"
                title="Show sidebar"
                variant="ghost"
              >
                <SidebarIcon />
              </Button>
              <NavControls />
            </>
          )}
          <TabBar />
        </div>
      </header>
    </div>
  );
}
