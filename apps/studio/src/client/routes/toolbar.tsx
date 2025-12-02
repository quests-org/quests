import { NavControls } from "@/client/components/nav-controls";
import TabBar from "@/client/components/tab-bar";
import { Button } from "@/client/components/ui/button";
import { captureClientEvent } from "@/client/lib/capture-client-event";
import { cn, isLinux, isMacOS, isWindows } from "@/client/lib/utils";
import { rpcClient } from "@/client/rpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { GemIcon, SidebarIcon } from "lucide-react";

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

  const { data: subscriptionData } = useQuery(
    rpcClient.user.live.subscription.experimental_liveOptions(),
  );

  const { mutate: addTab } = useMutation(rpcClient.tabs.add.mutationOptions());
  const router = useRouter();

  const isSidebarVisible = sidebarVisibility?.visible ?? true;
  const subscriptionDataExists = !!subscriptionData?.data;
  const hasSubscription = !!subscriptionData?.data?.plan;

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
            </div>
          )}
          <TabBar />
        </div>
        {subscriptionDataExists && !hasSubscription && (
          <div className="flex items-center [-webkit-app-region:no-drag]">
            <Button
              className="shrink-0 text-xs px-2 h-6 font-semibold gap-1"
              onClick={() => {
                captureClientEvent("upgrade.clicked", {
                  source: "toolbar",
                });
                const location = router.buildLocation({
                  to: "/subscribe",
                });
                addTab({ urlPath: location.href });
              }}
              size="sm"
              variant="brand"
            >
              <GemIcon className="size-3" />
              Upgrade Now
            </Button>
          </div>
        )}
      </header>
    </div>
  );
}
