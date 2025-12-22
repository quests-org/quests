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
}: {
  app: WorkspaceApp;
  centerContent?: React.ReactNode;
  className?: string;
  rightActions?: React.ReactNode;
  shouldReload?: boolean;
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
    <div className={cn("flex size-full flex-col", className)}>
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

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <AppIFrame
          app={app}
          className={cn(
            "min-h-0 flex-1",
            isConsoleOpen ? "rounded-b-none" : "rounded-b-lg",
          )}
          clientLogsAtom={clientLogsAtom}
          iframeRef={iframeRef}
          // Ensures the iframe is recreated when the app changes so old loading
          // states are cleared
          key={app.subdomain}
          onOpenConsole={() => {
            setIsConsoleOpen(true);
          }}
        />

        {isConsoleOpen && (
          <div className="h-66 shrink-0 border-t">
            <ConsoleWithLogs
              app={app}
              clientLogsAtom={clientLogsAtom}
              onCollapse={() => {
                setIsConsoleOpen(false);
              }}
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
}: {
  app: WorkspaceApp;
  clientLogsAtom: ReturnType<typeof atom<ClientLogLine[]>>;
  onCollapse: () => void;
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
      app={app}
      clientLogs={clientLogs}
      logs={runtimeLogs}
      onClearLogs={handleClearLogs}
      onCollapse={onCollapse}
    />
  );
}
