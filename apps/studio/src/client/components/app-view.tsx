import { type WorkspaceApp } from "@quests/workspace/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { atom, useAtom, useSetAtom } from "jotai";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { projectIframeRefAtom } from "../atoms/project";
import { useReload } from "../hooks/use-reload";
import { useShimIFrame } from "../hooks/use-shim-iframe";
import { cn } from "../lib/utils";
import { rpcClient } from "../rpc/client";
import { AppIFrame } from "./app-iframe";
import { AppToolbar } from "./app-toolbar";
import { type ClientLogLine } from "./console";
import { Console } from "./console";

export function AppView({
  app,
  centerContent,
  className,
  rightActions,
  shouldReload = true,
  showSendToChat = false,
}: {
  app: WorkspaceApp;
  centerContent?: React.ReactNode;
  className?: string;
  rightActions?: React.ReactNode;
  shouldReload?: boolean;
  showSendToChat?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const shimIFrame = useShimIFrame(iframeRef);
  const setProjectIframeRef = useSetAtom(projectIframeRefAtom);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const clientLogsAtom = useMemo(() => {
    // To ensure atom changes when app.subdomain changes
    void app.subdomain;
    return atom<ClientLogLine[]>([]);
  }, [app.subdomain]);

  const restartRuntimeMutation = useMutation(
    rpcClient.workspace.runtime.restart.mutationOptions(),
  );

  const handleReload = useCallback(() => {
    restartRuntimeMutation.mutate({ appSubdomain: app.subdomain });
    shimIFrame.reloadWindow();
  }, [app.subdomain, restartRuntimeMutation, shimIFrame]);

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

  useReload(
    useCallback(() => {
      if (shouldReload) {
        handleReload();
      }
    }, [shouldReload, handleReload]),
  );

  return (
    <div className={cn("flex flex-col size-full", className)}>
      <AppToolbar
        app={app}
        centerContent={centerContent}
        clientLogsAtom={clientLogsAtom}
        iframeRef={iframeRef}
        isConsoleOpen={isConsoleOpen}
        onConsoleToggle={() => {
          setIsConsoleOpen((prev) => !prev);
        }}
        onReload={handleReload}
        rightActions={rightActions}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <AppIFrame
          app={app}
          className={cn(
            "flex-1 min-h-0",
            isConsoleOpen ? "rounded-b-none" : "rounded-b-lg",
          )}
          clientLogsAtom={clientLogsAtom}
          iframeRef={iframeRef}
          onOpenConsole={() => {
            setIsConsoleOpen(true);
          }}
        />

        {isConsoleOpen && (
          <div className="h-66 border-t shrink-0">
            <ConsoleWithLogs
              app={app}
              clientLogsAtom={clientLogsAtom}
              onCollapse={() => {
                setIsConsoleOpen(false);
              }}
              showSendToChat={showSendToChat}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ConsoleWithLogs({
  app,
  clientLogsAtom,
  onCollapse,
  showSendToChat,
}: {
  app: WorkspaceApp;
  clientLogsAtom: ReturnType<typeof atom<ClientLogLine[]>>;
  onCollapse: () => void;
  showSendToChat: boolean;
}) {
  const { data: runtimeLogs = [] } = useQuery(
    rpcClient.workspace.runtime.log.live.list.experimental_liveOptions({
      input: { subdomain: app.subdomain },
    }),
  );
  const [clientLogs, setClientLogs] = useAtom(clientLogsAtom);
  const clearLogsMutation = useMutation(
    rpcClient.workspace.runtime.clearLogs.mutationOptions(),
  );

  const handleClearLogs = () => {
    clearLogsMutation.mutate({ appSubdomain: app.subdomain });
    setClientLogs([]);
  };

  return (
    <Console
      clientLogs={clientLogs}
      logs={runtimeLogs}
      onClearLogs={handleClearLogs}
      onCollapse={onCollapse}
      showSendToChat={showSendToChat}
      subdomain={app.subdomain}
    />
  );
}
