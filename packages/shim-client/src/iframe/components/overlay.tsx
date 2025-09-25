import { type HeartbeatResponse } from "@quests/workspace/for-shim";
import { FileX, Loader2 } from "lucide-react";

import { ErrorOverlay } from "./error-overlay";

interface OverlayProps {
  isInsideStudio: boolean;
  onOpenConsole: () => void;
  response: HeartbeatResponse | null;
}

export function Overlay({
  isInsideStudio,
  onOpenConsole,
  response,
}: OverlayProps) {
  if (!response || response.status === "ready") {
    return null;
  }

  if (response.status === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
        <Loader2 className="size-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (response.status === "error") {
    return (
      <ErrorOverlay
        isInsideStudio={isInsideStudio}
        onOpenConsole={onOpenConsole}
      />
    );
  }

  if (response.status === "not-found" || response.status === "not-runnable") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/60">
        <div className="relative max-w-2xl rounded-lg bg-card border p-8 shadow-lg">
          <div className="mb-4 flex items-center">
            <FileX className="mr-3 size-6 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-card-foreground">
              {response.status === "not-runnable"
                ? "App Not Runnable"
                : "App Not Found"}
            </h2>
          </div>
          <p className="mb-6 text-muted-foreground">
            {response.status === "not-runnable"
              ? "This app cannot be run because it has no package.json file."
              : "The requested app was not found. This is not a valid app URL."}
          </p>

          <div className="mb-4 mt-2 overflow-auto rounded-md bg-muted px-4 py-3 font-mono text-sm">
            <span className="text-muted-foreground">
              {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
              {window.location.protocol}//
            </span>
            <span className="text-orange-500">
              {window.location.hostname.split(".")[0]}
            </span>
            <span className="text-muted-foreground">
              .{window.location.hostname.split(".").slice(1).join(".")}:
              {window.location.port}
            </span>
          </div>

          <div className="text-sm text-muted-foreground">
            {response.status === "not-runnable"
              ? "Please ensure the app has a valid package.json file."
              : "This domain does not correspond to any existing app. Please check the URL and try again."}
          </div>
        </div>
      </div>
    );
  }

  if (response.status === "stopped") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
        <div className="rounded-lg bg-card border p-6 text-card-foreground shadow-lg">
          <div className="text-center">
            <div className="mb-2 text-lg font-semibold">Server Stopped</div>
            <div className="text-sm text-muted-foreground">
              The server has been stopped
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="rounded-lg bg-card border p-6 text-card-foreground shadow-lg">
        <div className="text-center">
          <div className="mb-2 text-lg font-semibold">Unknown Status</div>
          <div className="text-sm text-muted-foreground">
            The server status is {response.status}
          </div>
        </div>
      </div>
    </div>
  );
}
