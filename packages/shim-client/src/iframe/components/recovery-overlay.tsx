import { APP_PROTOCOL } from "@quests/shared";
import { AlertTriangle, ExternalLink, RefreshCw, X } from "lucide-react";

export function RecoveryOverlay({
  isInsideStudio,
  onDismiss,
  onOpenConsole,
  onReload,
}: {
  isInsideStudio: boolean;
  onDismiss: () => void;
  onOpenConsole: () => void;
  onReload: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/20">
      <div className="fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 sm:max-w-lg">
        <button
          className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:pointer-events-none"
          onClick={onDismiss}
        >
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </button>
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-destructive" />
            <h3 className="text-lg leading-none font-semibold tracking-tight">
              Nothing was rendered
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {/* cspell:ignore didn */}
            This application didn&apos;t render any content. You can try
            reloading the page, or ask the agent to look into the issue.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium whitespace-nowrap text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            onClick={onReload}
          >
            <RefreshCw className="size-4" />
            Reload Page
          </button>
          {isInsideStudio ? (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              onClick={onOpenConsole}
            >
              Open console
            </button>
          ) : (
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              onClick={() => window.open(`${APP_PROTOCOL}://`, "_self")}
            >
              <ExternalLink className="size-4" />
              Open in Quests
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
