import { APP_PROTOCOL } from "@quests/shared";
import { AlertCircle, ExternalLink } from "lucide-react";

export function ErrorOverlay({ onOpenConsole }: { onOpenConsole: () => void }) {
  const inStudio = isRunningInStudio();
  return (
    <div className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
      <div className="fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 sm:max-w-lg">
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-destructive" />
            <h3 className="text-lg font-semibold leading-none tracking-tight">
              Error
            </h3>
          </div>
          <p className="text-muted-foreground text-sm">
            {inStudio
              ? "There was an error running your app. Check the console for more details."
              : "There was an error running your app. For the best development experience with full debugging tools, open this app in Quests Studio."}
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          {inStudio ? (
            <button
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              onClick={onOpenConsole}
            >
              Open console
            </button>
          ) : (
            <button
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
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

function isRunningInStudio(): boolean {
  // TODO: implement this
  return true;
}
