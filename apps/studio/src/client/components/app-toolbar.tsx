import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { useShimIFrame } from "@/client/lib/iframe-messenger";
import { cn } from "@/client/lib/utils";
import { type WorkspaceApp } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { ChevronLeft, ChevronRight, PanelBottom, RotateCw } from "lucide-react";
import { type ReactNode, useEffect, useMemo } from "react";

import { lastSeenLogIdAtom } from "../atoms/console";
import { rpcClient } from "../rpc/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AppToolbarProps {
  app: WorkspaceApp;
  centerActions?: ReactNode;
  centerContent?: ReactNode;
  className?: string;
  disabled?: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  isConsoleCollapsed?: boolean;
  onConsoleToggle: () => void;
  rightActions?: ReactNode;
}

interface ConsoleBadgeProps {
  status: "error" | "new" | "none";
}

export function AppToolbar({
  app,
  centerActions,
  centerContent,
  className,
  disabled = false,
  iframeRef,
  isConsoleCollapsed = true,
  onConsoleToggle,
  rightActions,
}: AppToolbarProps) {
  const shimIFrame = useShimIFrame(iframeRef);
  const [lastSeenLogId, setLastSeenLogId] = useAtom(lastSeenLogIdAtom);

  const restartRuntimeMutation = useMutation(
    rpcClient.workspace.runtime.restart.mutationOptions(),
  );

  const { data: runtimeLogs = [] } = useQuery(
    rpcClient.workspace.runtime.log.live.list.experimental_liveOptions({
      input: { subdomain: app.subdomain },
    }),
  );

  useEffect(() => {
    if (!isConsoleCollapsed && runtimeLogs.length > 0) {
      const latestLogId = runtimeLogs.at(-1)?.id;
      if (latestLogId && latestLogId !== lastSeenLogId) {
        setLastSeenLogId(latestLogId);
      }
    }
  }, [runtimeLogs, isConsoleCollapsed, lastSeenLogId, setLastSeenLogId]);

  const badgeStatus = useMemo((): "error" | "new" | "none" => {
    if (runtimeLogs.length === 0 || !isConsoleCollapsed) {
      return "none";
    }

    if (!lastSeenLogId) {
      // If we've never seen any logs, check if there are any
      const hasErrors = runtimeLogs.some((log) => log.type === "error");
      return hasErrors ? "error" : "new";
    }

    const lastSeenIndex = runtimeLogs.findIndex(
      (log) => log.id === lastSeenLogId,
    );
    const newLogs =
      lastSeenIndex === -1 ? runtimeLogs : runtimeLogs.slice(lastSeenIndex + 1);

    if (newLogs.length === 0) {
      return "none";
    }

    const hasErrors = newLogs.some((log) => log.type === "error");
    return hasErrors ? "error" : "new";
  }, [runtimeLogs, lastSeenLogId, isConsoleCollapsed]);

  const handleConsoleToggleWithTracking = () => {
    if (isConsoleCollapsed && runtimeLogs.length > 0) {
      // Mark all current logs as seen when opening console
      setLastSeenLogId(runtimeLogs.at(-1)?.id ?? null);
    }
    onConsoleToggle();
  };

  return (
    <div
      className={cn(
        "bg-background flex items-center border-b px-2 py-1.5 gap-1 rounded-t-lg",
        className,
      )}
    >
      <div className="flex items-center gap-1 pr-1">
        <Button
          className="size-6"
          disabled={disabled}
          onClick={shimIFrame.historyBack}
          size="icon"
          variant="ghost"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          className="size-6"
          disabled={disabled}
          onClick={shimIFrame.historyForward}
          size="icon"
          variant="ghost"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="size-6"
              disabled={disabled}
              onClick={async () => {
                await restartRuntimeMutation.mutateAsync({
                  appSubdomain: app.subdomain,
                });
                shimIFrame.reloadWindow();
              }}
              size="icon"
              variant="ghost"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh and restart</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1 flex items-center gap-1 min-w-0">
        {centerContent ?? (
          <Input
            className="flex-1 text-center min-w-0 text-xs md:text-xs h-8 font-medium"
            readOnly
            value={app.urls.localhost}
          />
        )}
        <>{centerActions}</>
      </div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <Button
                className="size-6"
                disabled={disabled}
                onClick={handleConsoleToggleWithTracking}
                size="icon"
                variant={isConsoleCollapsed ? "ghost" : "secondary"}
              >
                <PanelBottom className="size-4" />
              </Button>
              <ConsoleBadge status={badgeStatus} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isConsoleCollapsed ? "Show Console" : "Hide Console"}</p>
          </TooltipContent>
        </Tooltip>

        {rightActions && (
          <div className="flex items-center gap-1">{rightActions}</div>
        )}
      </div>
    </div>
  );
}

function ConsoleBadge({ status }: ConsoleBadgeProps) {
  if (status === "none") {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute top-0.5 right-0.5 size-1.5 rounded-full ring-2 ring-background animate-in fade-in-0 zoom-in-75 duration-200",
        status === "error" ? "bg-destructive" : "bg-primary",
      )}
    />
  );
}
