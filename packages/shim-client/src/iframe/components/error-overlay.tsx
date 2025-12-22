import { APP_PROTOCOL } from "@quests/shared";
import { AlertCircle, ExternalLink } from "lucide-react";

export function ErrorOverlay({
  isInsideStudio,
  onOpenConsole,
}: {
  isInsideStudio: boolean;
  onOpenConsole: () => void;
}) {
  return (
    // eslint-disable-next-line better-tailwindcss/no-unregistered-classes
    <div className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50">
      <div className="fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 sm:max-w-lg">
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-destructive" />
            <h3 className="text-lg leading-none font-semibold tracking-tight">
              Error
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {isInsideStudio
              ? "There was an error running your app. Check the console for more details."
              : "There was an error running your app. For the best development experience with full debugging tools, open this app in Quests app."}
          </p>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
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
