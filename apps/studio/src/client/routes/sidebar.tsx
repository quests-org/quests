import { StudioSidebar } from "@/client/components/studio-sidebar";
import { SidebarProvider } from "@/client/components/ui/sidebar";
import { cn, isMacOS } from "@/client/lib/utils";
import { SIDEBAR_WIDTH } from "@/shared/constants";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { rpcClient } from "../rpc/client";

export const Route = createFileRoute("/sidebar")({
  component: SidebarPage,
  head: () => ({
    meta: [
      {
        content: "",
        name: "transparent-background",
      },
    ],
  }),
});

function SidebarPage() {
  const { data: sidebarState } = useQuery(
    rpcClient.sidebar.live.state.experimental_liveOptions({}),
  );
  const isOpen = sidebarState?.isOpen ?? true;

  return (
    <>
      <div data-testid="sidebar-page" />
      <div
        className={cn(
          "flex h-screen w-full flex-col overflow-hidden overflow-x-hidden border-r border-border select-none",
          !isOpen && "hidden",
        )}
        style={
          {
            "--sidebar-width": `${SIDEBAR_WIDTH}px`,
            width: `${SIDEBAR_WIDTH}px`,
          } as React.CSSProperties
        }
      >
        <SidebarProvider>
          <div className="min-h-0 flex-1">
            <StudioSidebar
              className="h-full"
              disableBackground={isMacOS()}
              isOpen={isOpen}
            />
          </div>
        </SidebarProvider>
      </div>
    </>
  );
}
