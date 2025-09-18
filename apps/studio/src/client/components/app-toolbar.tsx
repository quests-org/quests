import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { useShimIFrame } from "@/client/hooks/use-shim-iframe";
import { cn } from "@/client/lib/utils";
import { type WorkspaceApp } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type atom, useAtom } from "jotai";
import { ChevronLeft, ChevronRight, PanelBottom, RotateCw } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { rpcClient } from "../rpc/client";
import { type ClientLogLine } from "./console";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AppToolbarProps {
  app: WorkspaceApp;
  centerActions?: ReactNode;
  centerContent?: ReactNode;
  className?: string;
  clientLogsAtom: ReturnType<typeof atom<ClientLogLine[]>>;
  disabled?: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  isConsoleOpen?: boolean;
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
  clientLogsAtom,
  disabled = false,
  iframeRef,
  isConsoleOpen = true,
  onConsoleToggle,
  rightActions,
}: AppToolbarProps) {
  const shimIFrame = useShimIFrame(iframeRef);
  const [lastSeenLogId, setLastSeenLogId] = useState<null | string>(null);

  const restartRuntimeMutation = useMutation(
    rpcClient.workspace.runtime.restart.mutationOptions(),
  );

  const { data: runtimeLogs = [] } = useQuery(
    rpcClient.workspace.runtime.log.live.list.experimental_liveOptions({
      input: { subdomain: app.subdomain },
    }),
  );

  const [clientLogs, setClientLogs] = useAtom(clientLogsAtom);

  useEffect(() => {
    if (!isConsoleOpen && (runtimeLogs.length > 0 || clientLogs.length > 0)) {
      const latestServerLogId = runtimeLogs.at(-1)?.id;
      const latestClientLogId = clientLogs.at(-1)?.id;

      // Use the most recent log ID (prefer server logs if both exist at the same time)
      const latestLogId = latestServerLogId || latestClientLogId;
      if (latestLogId && latestLogId !== lastSeenLogId) {
        setLastSeenLogId(latestLogId);
      }
    }
  }, [runtimeLogs, clientLogs, isConsoleOpen, lastSeenLogId, setLastSeenLogId]);

  const badgeStatus = useMemo((): "error" | "new" | "none" => {
    if (
      (runtimeLogs.length === 0 && clientLogs.length === 0) ||
      !isConsoleOpen
    ) {
      return "none";
    }

    if (!lastSeenLogId) {
      // If we've never seen any logs, check if there are any errors
      const hasServerErrors = runtimeLogs.some((log) => log.type === "error");
      const hasClientErrors = clientLogs.some((log) => log.type === "error");
      return hasServerErrors || hasClientErrors ? "error" : "new";
    }

    // Find new server logs
    const lastSeenServerIndex = runtimeLogs.findIndex(
      (log) => log.id === lastSeenLogId,
    );
    const newServerLogs =
      lastSeenServerIndex === -1
        ? runtimeLogs
        : runtimeLogs.slice(lastSeenServerIndex + 1);

    // Find new client logs
    const lastSeenClientIndex = clientLogs.findIndex(
      (log) => log.id === lastSeenLogId,
    );
    const newClientLogs =
      lastSeenClientIndex === -1
        ? clientLogs
        : clientLogs.slice(lastSeenClientIndex + 1);

    if (newServerLogs.length === 0 && newClientLogs.length === 0) {
      return "none";
    }

    const hasServerErrors = newServerLogs.some((log) => log.type === "error");
    const hasClientErrors = newClientLogs.some((log) => log.type === "error");

    return hasServerErrors || hasClientErrors ? "error" : "new";
  }, [runtimeLogs, clientLogs, lastSeenLogId, isConsoleOpen]);

  const handleConsoleToggleWithTracking = () => {
    if (isConsoleOpen && (runtimeLogs.length > 0 || clientLogs.length > 0)) {
      // Mark all current logs as seen when opening console
      const latestServerLogId = runtimeLogs.at(-1)?.id;
      const latestClientLogId = clientLogs.at(-1)?.id;
      const latestLogId = latestServerLogId || latestClientLogId;
      setLastSeenLogId(latestLogId ?? null);
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
                setClientLogs([]);
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
                variant={isConsoleOpen ? "ghost" : "secondary"}
              >
                <PanelBottom className="size-4" />
              </Button>
              <ConsoleBadge status={badgeStatus} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isConsoleOpen ? "Show Console" : "Hide Console"}</p>
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
