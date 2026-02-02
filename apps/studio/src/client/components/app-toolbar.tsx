import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Toggle } from "@/client/components/ui/toggle";
import { useShimIFrame } from "@/client/hooks/use-shim-iframe";
import { cn } from "@/client/lib/utils";
import { type WorkspaceApp } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type atom, useAtomValue } from "jotai";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLinkIcon,
  History,
  PanelBottom,
  RotateCw,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

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
  isVersionsOpen?: boolean;
  onConsoleToggle: () => void;
  onReload: () => void;
  onVersionsToggle?: () => void;
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
  isVersionsOpen = false,
  onConsoleToggle,
  onReload,
  onVersionsToggle,
  rightActions,
}: AppToolbarProps) {
  const shimIFrame = useShimIFrame(iframeRef);
  const [lastSeenLogTimestamp, setLastSeenLogTimestamp] = useState<
    null | number
  >(null);

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
    if (!isConsoleOpen) {
      onConsoleToggle();
    } else if (runtimeLogs.length > 0 || clientLogs.length > 0) {
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
      onConsoleToggle();
    } else {
      onConsoleToggle();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-t-lg border-b bg-background px-2 py-1.5",
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
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          className="size-6"
          disabled={disabled}
          onClick={shimIFrame.historyForward}
          size="icon"
          variant="ghost"
        >
          <ChevronRight className="size-4" />
        </Button>

        <TooltipNearIFrame
          delayDuration={0} // Because the icon looks like refresh only, we show the tooltip immediately
        >
          <TooltipTrigger asChild>
            <Button
              className="size-6"
              disabled={disabled}
              onClick={onReload}
              size="icon"
              variant="ghost"
            >
              <RotateCw className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh and restart</p>
          </TooltipContent>
        </TooltipNearIFrame>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-1">
        {centerContent ?? (
          <div className="relative flex-1">
            <Input
              className="h-8 min-w-0 flex-1 pr-7 text-center text-xs font-medium text-muted-foreground md:text-xs"
              readOnly
              value={app.urls.localhost}
            />
            <TooltipNearIFrame>
              <TooltipTrigger asChild>
                <Button
                  className="absolute top-1/2 right-2 size-4 -translate-y-1/2 p-0"
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
            </TooltipNearIFrame>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        {onVersionsToggle && (
          <TooltipNearIFrame>
            <TooltipTrigger asChild>
              {/* Relative div wrapper prevents tooltip/toggle conflict */}
              <div className="relative">
                <Toggle
                  aria-label={
                    isVersionsOpen ? "Hide Versions" : "Show Versions"
                  }
                  disabled={disabled}
                  onPressedChange={onVersionsToggle}
                  pressed={isVersionsOpen}
                  size="sm"
                >
                  <History className="size-4" />
                </Toggle>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isVersionsOpen ? "Hide versions" : "Show versions"}</p>
            </TooltipContent>
          </TooltipNearIFrame>
        )}

        <TooltipNearIFrame>
          <TooltipTrigger asChild>
            {/* Relative div wrapper prevents tooltip/toggle conflict */}
            <div className="relative">
              <Toggle
                aria-label={isConsoleOpen ? "Hide Console" : "Show Console"}
                disabled={disabled}
                onPressedChange={handleConsoleToggleWithTracking}
                pressed={isConsoleOpen}
                size="sm"
              >
                <PanelBottom className="size-4" />
              </Toggle>
              <ConsoleBadge status={badgeStatus} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isConsoleOpen ? "Hide console" : "Show console"}</p>
          </TooltipContent>
        </TooltipNearIFrame>

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
        "absolute top-1.5 right-1.5 size-1.5 animate-in rounded-full ring-2 ring-background duration-200 fade-in-0 zoom-in-75",
        status === "error" ? "bg-destructive" : "bg-primary",
      )}
    />
  );
}

function TooltipNearIFrame({
  children,
  ...props
}: React.ComponentProps<typeof Tooltip>) {
  return (
    // Disable hoverable content to prevent tooltip from lingering when user
    // mouses over an iframe after a tooltip
    <Tooltip disableHoverableContent {...props}>
      {children}
    </Tooltip>
  );
}
