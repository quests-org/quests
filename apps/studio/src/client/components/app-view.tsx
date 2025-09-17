import { type WorkspaceApp } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { ScopeProvider } from "jotai-scope";
import { ExternalLinkIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { lastSeenLogIdAtom } from "../atoms/console";
import { projectIframeRefAtom } from "../atoms/project-iframe";
import { cn } from "../lib/utils";
import { rpcClient } from "../rpc/client";
import { AppIFrame } from "./app-iframe";
import { AppToolbar } from "./app-toolbar";
import { Console } from "./console";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AppViewProps {
  app: WorkspaceApp;
  centerActions?: React.ReactNode;
  centerContent?: React.ReactNode;
  className?: string;
  rightActions?: React.ReactNode;
}

interface ConsoleWithLogsProps {
  app: WorkspaceApp;
  onCollapse: () => void;
}

export function AppView({
  app,
  centerActions: externalCenterActions,
  centerContent,
  className,
  rightActions,
}: AppViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const setProjectIframeRef = useSetAtom(projectIframeRefAtom);

  const [isConsoleOpen, setIsConsoleOpen] = useState(true);

  const openExternalLinkMutation = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
  );

  const handleOpenExternalClick = () => {
    if (app.type === "project") {
      openExternalLinkMutation.mutate({ url: app.urls.localhost });
    }
  };

  useEffect(() => {
    if (app.type === "project") {
      setProjectIframeRef(iframeRef);
    }
    return () => {
      if (app.type === "project") {
        setProjectIframeRef(null);
      }
    };
  }, [app.type, setProjectIframeRef, iframeRef]);

  const handleConsoleToggle = () => {
    if (isConsoleOpen) {
      setIsConsoleOpen(false);
    } else {
      setIsConsoleOpen(true);
    }
  };

  const projectCenterActions =
    app.type === "project" ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="ml-1 size-6"
            onClick={handleOpenExternalClick}
            size="icon"
            variant="ghost"
          >
            <ExternalLinkIcon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Open in external browser</p>
        </TooltipContent>
      </Tooltip>
    ) : null;

  const centerActions = (
    <>
      {externalCenterActions}
      {projectCenterActions}
    </>
  );

  return (
    <ScopeProvider atoms={[lastSeenLogIdAtom]}>
      <div className={cn("flex flex-col size-full", className)}>
        <AppToolbar
          app={app}
          centerActions={centerActions}
          centerContent={centerContent}
          iframeRef={iframeRef}
          isConsoleOpen={isConsoleOpen}
          onConsoleToggle={handleConsoleToggle}
          rightActions={rightActions}
        />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <AppIFrame
            app={app}
            className={cn(
              "flex-1 min-h-0",
              isConsoleOpen ? "rounded-b-lg" : "",
            )}
            iframeRef={iframeRef}
          />

          {!isConsoleOpen && (
            <div className="h-66 border-t shrink-0">
              <ConsoleWithLogs
                app={app}
                onCollapse={() => {
                  setIsConsoleOpen(true);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </ScopeProvider>
  );
}

function ConsoleWithLogs({ app, onCollapse }: ConsoleWithLogsProps) {
  const { data: runtimeLogs = [] } = useQuery(
    rpcClient.workspace.runtime.log.live.list.experimental_liveOptions({
      input: { subdomain: app.subdomain },
    }),
  );

  const clearLogsMutation = useMutation(
    rpcClient.workspace.runtime.clearLogs.mutationOptions(),
  );

  const handleClearLogs = () => {
    clearLogsMutation.mutate({ appSubdomain: app.subdomain });
  };

  return (
    <Console
      logs={runtimeLogs}
      onClearLogs={handleClearLogs}
      onCollapse={onCollapse}
    />
  );
}
