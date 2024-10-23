import { cn } from "@/client/lib/utils";
import { ChevronDownIcon, ChevronUpIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { TerminalWindowIcon } from "./icons";
import { ServerStatusBadge } from "./server-status-badge";
import { Button } from "./ui/button";

interface ConsoleProps {
  isCollapsed?: boolean;
  onCollapse: () => void;
  onRestore: () => void;
}

export function Console({ isCollapsed, onCollapse, onRestore }: ConsoleProps) {
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const runState = "running";
  const output = ["Not implemented"];

  useEffect(() => {
    if (!isCollapsed) {
      consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isCollapsed]);

  return (
    <div
      className={cn(
        `
          bottom-0 flex h-full w-full flex-col overflow-hidden border-t
          border-border bg-background
        `,
      )}
    >
      <div
        className={`
          z-5 sticky top-0 flex h-fit w-full flex-row
          items-center justify-between border-b border-border bg-muted px-2
          py-1
        `}
        onClick={isCollapsed ? onRestore : onCollapse}
      >
        <div
          className={`
            flex flex-row items-center gap-2 pl-2 text-sm text-foreground
          `}
        >
          <div className="text-muted-foreground">
            <TerminalWindowIcon />
          </div>
          <div className="text-xs">Console</div>
        </div>
        <div className="flex flex-row items-center gap-1 text-xs">
          <ServerStatusBadge state={runState} />
          <Button
            className="size-fit p-1"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              alert("Not implemented");
            }}
            size="icon"
            title="Restart server"
            variant="ghost"
          >
            <RotateCcwIcon />
          </Button>
          <Button
            className="size-fit p-1"
            onClick={isCollapsed ? onRestore : onCollapse}
            size="icon"
            variant="ghost"
          >
            {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>
        </div>
      </div>

      <div className="flex-auto overflow-y-scroll pt-2">
        <div
          className={`
            flex flex-col border-border bg-background px-2 font-mono text-xs
          `}
        >
          {output.map((line, index) => (
            <div className="flex flex-row" key={index}>
              <div
                className={`
                  shrink-1 overflow-x-auto whitespace-pre-wrap break-all
                  text-foreground
                `}
              >
                {line}
              </div>
            </div>
          ))}
        </div>
        <div className="h-2" ref={consoleEndRef} />
      </div>
    </div>
  );
}
