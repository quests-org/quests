import { type WorkspaceApp } from "@quests/workspace/client";
import { XIcon } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import { useAppState } from "../hooks/use-app-state";
import { cn } from "../lib/utils";

interface AppIFrameProps {
  app: WorkspaceApp;
  className?: string;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
}

export function AppIFrame({ app, className, iframeRef }: AppIFrameProps) {
  const [coverState, setCoverState] = useState<
    "dismissed" | "hidden" | "hiding" | "visible"
  >("hidden");
  const wasActiveRef = useRef(false);

  const { data: appState } = useAppState({
    subdomain: app.subdomain,
  });

  const hasRunningSession = (appState?.sessionActors ?? []).some((session) =>
    session.tags.includes("agent.running"),
  );

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
    <div className={cn("relative size-full", className)}>
      <iframe
        allow="accelerometer; camera; encrypted-media; display-capture; geolocation; gyroscope; microphone; midi; payment; usb; xr-spatial-tracking; clipboard-read; clipboard-write"
        allowFullScreen
        className="size-full bg-white"
        ref={iframeRef}
        sandbox="allow-downloads allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts"
        src={app.urls.localhost}
        title={`${app.subdomain} preview`}
      />

      {shouldShowCover && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-40">
          <div className="bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg sm:max-w-lg">
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

            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h3 className="shiny-text text-lg font-semibold leading-none tracking-tight">
                Working on your app...
              </h3>
              <p className="text-muted-foreground text-sm">
                Changes are being made to your app right now. It may refresh or
                show errors during this process. Dismiss this if you want to
                watch.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
