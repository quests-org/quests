import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { useShimIFrame } from "@/client/lib/iframe-messenger";
import { cn } from "@/client/lib/utils";
import { type WorkspaceApp } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { type ReactNode } from "react";

import { rpcClient } from "../rpc/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AppToolbarProps {
  app: WorkspaceApp;
  centerActions?: ReactNode;
  centerContent?: ReactNode;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  rightActions?: ReactNode;
}

export function AppToolbar({
  app,
  centerActions,
  centerContent,
  className,
  compact = false,
  disabled = false,
  iframeRef,
  rightActions,
}: AppToolbarProps) {
  const shimIFrame = useShimIFrame(iframeRef);
  const restartRuntimeMutation = useMutation(
    rpcClient.workspace.runtime.restart.mutationOptions(),
  );

  return (
    <div
      className={cn(
        "bg-background flex flex-wrap items-center border-b shadow-sm",
        compact ? "px-2 py-2 gap-1" : "gap-2 px-2 py-2.5",
        className,
      )}
    >
      <div className="flex items-center gap-1 pr-1">
        <Button
          className={cn(compact && "size-6")}
          disabled={disabled}
          onClick={shimIFrame.historyBack}
          size="icon"
          variant="ghost"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          className={cn(compact && "size-6")}
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
              className={cn(compact && "size-6")}
              disabled={disabled}
              onClick={async () => {
                await restartRuntimeMutation.mutateAsync({
                  appSubdomain: app.subdomain,
                });
                shimIFrame.reloadWindow();
              }}
              size="icon"
              title="Refresh app"
              variant="ghost"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh and restart app</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1 flex items-center gap-1">
        {centerContent ?? (
          <Input
            className="flex-1 text-center"
            readOnly
            value={app.urls.localhost}
          />
        )}
        <>{centerActions}</>
      </div>

      {rightActions && (
        <div className="flex items-center gap-2">{rightActions}</div>
      )}
    </div>
  );
}
