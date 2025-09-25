import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { useShimIFrame } from "@/client/hooks/use-shim-iframe";
import { cn } from "@/client/lib/utils";
import { type WorkspaceApp } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type atom, useAtomValue } from "jotai";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLinkIcon,
  PanelBottom,
  RotateCw,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { rpcClient } from "../rpc/client";
import { type ClientLogLine } from "./console";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AppToolbarProps {
  app: WorkspaceApp;
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
  const [lastSeenLogTimestamp, setLastSeenLogTimestamp] = useState<
    null | number
  >(null);

  const restartRuntimeMutation = useMutation(
    rpcClient.workspace.runtime.restart.mutationOptions(),
  );

  const openExternalLinkMutation = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
  );

  const handleOpenExternalClick = () => {
    openExternalLinkMutation.mutate({ url: app.urls.localRedirect });
  };

  const { data: runtimeLogs = [] } = useQuery(
    rpcClient.workspace.runtime.log.live.list.experimental_liveOptions({
      input: { subdomain: app.subdomain },
    }),
  );

  const clientLogs = useAtomValue(clientLogsAtom);

  useEffect(() => {
    if (isConsoleOpen && (runtimeLogs.length > 0 || clientLogs.length > 0)) {
      const latestServerLog = runtimeLogs.at(-1);
      const latestClientLog = clientLogs.at(-1);

      const latestServerLogTimestamp = latestServerLog?.createdAt
        ? new Date(latestServerLog.createdAt).getTime()
        : null;
      const latestClientLogTimestamp = latestClientLog?.createdAt
        ? latestClientLog.createdAt.getTime()
        : null;

      const latestTimestamp = Math.max(
        latestServerLogTimestamp ?? 0,
        latestClientLogTimestamp ?? 0,
      );

      if (latestTimestamp > 0 && latestTimestamp !== lastSeenLogTimestamp) {
        setLastSeenLogTimestamp(latestTimestamp);
      }
    }
  }, [
    runtimeLogs,
    clientLogs,
    isConsoleOpen,
    lastSeenLogTimestamp,
    setLastSeenLogTimestamp,
  ]);

  const badgeStatus = useMemo((): "error" | "new" | "none" => {
    if (
      (runtimeLogs.length === 0 && clientLogs.length === 0) ||
      isConsoleOpen
    ) {
      return "none";
    }

    if (!lastSeenLogTimestamp) {
      const hasServerErrors = runtimeLogs.some((log) => log.type === "error");
      const hasClientErrors = clientLogs.some((log) => log.type === "error");
      return hasServerErrors || hasClientErrors ? "error" : "new";
    }

    const newServerLogs = runtimeLogs.filter(
      (log) => new Date(log.createdAt).getTime() > lastSeenLogTimestamp,
    );
    const newClientLogs = clientLogs.filter(
      (log) => log.createdAt.getTime() > lastSeenLogTimestamp,
    );

    if (newServerLogs.length === 0 && newClientLogs.length === 0) {
      return "none";
    }

    const hasServerErrors = newServerLogs.some((log) => log.type === "error");
    const hasClientErrors = newClientLogs.some((log) => log.type === "error");

    return hasServerErrors || hasClientErrors ? "error" : "new";
  }, [runtimeLogs, clientLogs, lastSeenLogTimestamp, isConsoleOpen]);

  const handleConsoleToggleWithTracking = () => {
    if (isConsoleOpen && (runtimeLogs.length > 0 || clientLogs.length > 0)) {
      const latestServerLog = runtimeLogs.at(-1);
      const latestClientLog = clientLogs.at(-1);

      const latestServerLogTimestamp = latestServerLog?.createdAt
        ? new Date(latestServerLog.createdAt).getTime()
        : null;
      const latestClientLogTimestamp = latestClientLog?.createdAt
        ? latestClientLog.createdAt.getTime()
        : null;

      const latestTimestamp = Math.max(
        latestServerLogTimestamp ?? 0,
        latestClientLogTimestamp ?? 0,
      );

      if (latestTimestamp > 0) {
        setLastSeenLogTimestamp(latestTimestamp);
      }
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
          <div className="flex-1 relative">
            <Input
              className="flex-1 text-center min-w-0 text-xs md:text-xs h-8 font-medium text-muted-foreground pr-7"
              readOnly
              value={app.urls.localhost}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-4 p-0"
                  onClick={handleOpenExternalClick}
                  size="icon"
                  variant="ghost"
                >
                  <ExternalLinkIcon className="size-3 text-muted-foreground/70" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Open in external browser</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
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
                variant="ghost"
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
