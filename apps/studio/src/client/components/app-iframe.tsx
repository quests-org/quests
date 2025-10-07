import { ShimIFrameOutMessageSchema } from "@quests/shared/shim";
import { type WorkspaceApp } from "@quests/workspace/client";
import { useMutation } from "@tanstack/react-query";
import { type atom, useSetAtom } from "jotai";
import { Circle, Loader2, Square, XIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { ulid } from "ulid";

import { useAppState } from "../hooks/use-app-state";
import { cn } from "../lib/utils";
import { rpcClient } from "../rpc/client";
import { type ClientLogLine } from "./console";
import { Button } from "./ui/button";

export function AppIFrame({
  app,
  className,
  clientLogsAtom,
  iframeRef,
  onOpenConsole,
}: {
  app: WorkspaceApp;
  className?: string;
  clientLogsAtom: ReturnType<typeof atom<ClientLogLine[]>>;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  onOpenConsole?: () => void;
}) {
  const [coverState, setCoverState] = useState<
    "dismissed" | "hidden" | "hiding" | "visible"
  >("hidden");
  const wasActiveRef = useRef(false);
  const setClientLogs = useSetAtom(clientLogsAtom);

  const { data: appState } = useAppState({
    subdomain: app.subdomain,
  });

  const stopSessions = useMutation(
    rpcClient.workspace.session.stop.mutationOptions(),
  );

  const hasRunningSession = (appState?.sessionActors ?? []).some((session) =>
    session.tags.includes("agent.running"),
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only handle messages from this specific iframe
      const expectedOrigin = new URL(app.urls.localhost).origin;
      if (
        !iframeRef?.current?.contentWindow ||
        event.source !== iframeRef.current.contentWindow ||
        event.origin !== expectedOrigin
      ) {
        return;
      }

      const parseResult = ShimIFrameOutMessageSchema.safeParse(event.data);
      if (parseResult.success) {
        const messageData = parseResult.data;

        switch (messageData.type) {
          case "console-log": {
            const message = messageData.value.message;

            setClientLogs((prev) => [
              ...prev,
              {
                createdAt: new Date(),
                id: ulid(),
                message,
                type: messageData.value.type,
              },
            ]);
            break;
          }
          case "open-console": {
            onOpenConsole?.();
            break;
          }
          case "will-reload": {
            setClientLogs([]);
            break;
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [setClientLogs, iframeRef, app.urls.localhost, onOpenConsole]);

  // Keep cover visible briefly after session ends to prevent modal being
  // dismissed right before the app reboots
  useEffect(() => {
    if (hasRunningSession) {
      setCoverState((current) =>
        current === "dismissed" ? "dismissed" : "visible",
      );
      wasActiveRef.current = true;
    } else if (wasActiveRef.current) {
      setCoverState((current) =>
        current === "dismissed" ? "dismissed" : "hiding",
      );
      const timeoutId = setTimeout(() => {
        setCoverState("hidden");
        wasActiveRef.current = false;
      }, 2000);
      return () => {
        clearTimeout(timeoutId);
      };
    }
    return;
  }, [hasRunningSession]);

  const shouldShowCover = coverState === "visible" || coverState === "hiding";

  return (
    <div className={cn("relative size-full overflow-hidden", className)}>
      <iframe
        allow="accelerometer; autoplay; camera; clipboard-read; clipboard-write; display-capture; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking"
        className="size-full bg-white"
        key={app.urls.localhost} // Must be set or iframe will be shared and allow navigation between apps
        ref={iframeRef}
        sandbox="allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-presentation"
        src={app.urls.localhost}
        title={`${app.subdomain} preview`}
      />

      {shouldShowCover && (
        <div className="absolute inset-0 flex justify-center pt-8 bg-black/60 backdrop-blur-xs z-40 rounded-[inherit]">
          <div className="bg-background relative z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg border p-6 shadow-lg sm:max-w-sm h-fit mx-4">
            <button
              className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
              onClick={() => {
                setCoverState("dismissed");
              }}
              type="button"
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </button>

            <div className="flex flex-col space-y-4 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                <h3 className="shiny-text text-lg font-semibold leading-6 tracking-tight">
                  Agent is working...
                </h3>
              </div>

              <Button
                className="gap-1.5"
                disabled={stopSessions.isPending}
                onClick={() => {
                  setCoverState("dismissed");
                  stopSessions.mutate({ subdomain: app.subdomain });
                }}
                variant="secondary"
              >
                <div className="relative flex items-center justify-center">
                  <Circle className="size-4 stroke-2 animate-spin" />
                  <Square className="size-1.5 fill-current absolute inset-0 m-auto" />
                </div>
                {stopSessions.isPending ? "Stopping..." : "Stop agent"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
