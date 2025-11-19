import { AlertTriangle, RefreshCw, X } from "lucide-react";

export function RecoveryOverlay({
  onDismiss,
  onReload,
}: {
  onDismiss: () => void;
  onReload: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
      <div className="fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 sm:max-w-lg">
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-destructive" />
            <h3 className="text-lg font-semibold leading-none tracking-tight">
              Nothing was rendered
            </h3>
          </div>
          <p className="text-muted-foreground text-sm">
            {/* cspell:ignore didn */}
            This application didn&apos;t render any content. You can try
            reloading the page, or ask the agent to look into the issue.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2">
          <button
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2"
            onClick={onDismiss}
          >
            <X className="size-4" />
            Dismiss
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            onClick={onReload}
          >
            <RefreshCw className="size-4" />
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
