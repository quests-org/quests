import { APP_PROTOCOL } from "@quests/shared";
import { AlertCircle, ExternalLink } from "lucide-react";

export function ErrorOverlay({ onOpenConsole }: { onOpenConsole: () => void }) {
  const inStudio = isRunningInStudio();
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="relative max-w-2xl rounded-lg bg-card border p-8 shadow-lg">
        <div className="mb-4 flex items-center">
          <AlertCircle className="mr-3 size-6 text-destructive" />
          <h2 className="text-xl font-semibold text-card-foreground">Error</h2>
        </div>

        <div className="mt-4 flex flex-col items-center gap-4">
          <p className="text-muted-foreground text-center">
            {inStudio
              ? "There was an error running your app. Check the console for more details."
              : "There was an error running your app. For the best development experience with full debugging tools, open this app in Quests Studio."}
          </p>
          {inStudio ? (
            <button
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 h-9 px-4 py-2"
              onClick={onOpenConsole}
            >
              Open console
            </button>
          ) : (
            <button
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 h-9 px-4 py-2"
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
