import { serverExceptionsAtom } from "@/client/atoms/server-exceptions";
import { Button } from "@/client/components/ui/button";
import { useAtom } from "jotai";
import { AlertCircle, X } from "lucide-react";

export function ServerExceptionsAlert() {
  const [exceptions, setExceptions] = useAtom(serverExceptionsAtom);

  const toggleException = (index: number) => {
    setExceptions((prev) =>
      prev.map((ex, i) =>
        i === index ? { ...ex, expanded: !ex.expanded } : ex,
      ),
    );
  };

  const clearExceptions = () => {
    setExceptions([]);
  };

  if (exceptions.length === 0) {
    return null;
  }

  return (
    <div className="border-b bg-destructive/5">
      <div className="px-3 py-2 flex items-center gap-2">
        <AlertCircle className="size-4 text-destructive shrink-0" />
        <span className="text-xs font-medium text-destructive flex-1">
          {exceptions.length} Server{" "}
          {exceptions.length === 1 ? "Exception" : "Exceptions"}
        </span>
        <Button
          className="size-5 text-destructive hover:text-destructive"
          onClick={clearExceptions}
          size="icon"
          variant="ghost"
        >
          <X className="size-3" />
        </Button>
      </div>
      <div className="max-h-32 overflow-y-auto px-3 pb-2">
        <div className="flex flex-col gap-1">
          {exceptions.map((exception, index) => (
            <div className="flex flex-col" key={exception.timestamp}>
              <button
                className="text-left text-xs hover:bg-muted/50 p-1 rounded transition-colors"
                onClick={() => {
                  toggleException(index);
                }}
                type="button"
              >
                <div className="flex items-start gap-1">
                  <span className="text-muted-foreground shrink-0 text-[10px] mt-px">
                    {exception.expanded ? "▼" : "▶"}
                  </span>
                  <span className="font-mono text-[11px] leading-tight break-all">
                    {exception.firstLine}
                  </span>
                </div>
              </button>
              {exception.expanded && (
                <pre className="text-[10px] leading-tight bg-muted/50 p-1.5 rounded overflow-x-auto whitespace-pre-wrap ml-3 mt-0.5 font-mono">
                  {exception.content}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
