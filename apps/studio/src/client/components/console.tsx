import { cn } from "@/client/lib/utils";
import { ChevronDown, ChevronUpIcon, Trash, X } from "lucide-react";
import { useStickToBottom } from "use-stick-to-bottom";

import { type RPCOutput } from "../rpc/client";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface ConsoleProps {
  isCollapsed?: boolean;
  logs: RPCOutput["workspace"]["runtime"]["log"]["list"];
  onClearLogs: () => void;
  onCollapse: () => void;
  onRestore: () => void;
}

export function Console({
  isCollapsed,
  logs,
  onClearLogs,
  onCollapse,
  onRestore,
}: ConsoleProps) {
  const { contentRef, isNearBottom, scrollRef, scrollToBottom } =
    useStickToBottom({ mass: 0.8 });

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-l border-r border-b border-border bg-background relative rounded-b-lg">
      <div className="flex h-fit w-full flex-row items-center justify-between border-b border-border bg-background px-2 py-1.5">
        <div className="flex flex-row items-center gap-2 pl-2 text-sm text-foreground">
          <div className="text-xs">Console</div>
        </div>
        <div className="flex flex-row items-center gap-1 text-xs">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-fit p-1"
                onClick={onClearLogs}
                size="icon"
                variant="ghost"
              >
                <Trash className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear console</p>
            </TooltipContent>
          </Tooltip>
          <Button
            className="size-fit p-1"
            onClick={isCollapsed ? onRestore : onCollapse}
            size="icon"
            variant="ghost"
          >
            {isCollapsed ? <ChevronUpIcon /> : <X />}
          </Button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto pt-2 min-h-0 bg-muted/50"
        ref={scrollRef}
      >
        <div
          className="flex flex-col border-border px-2 font-mono text-xs"
          ref={contentRef}
        >
          {logs.map((line, index) => {
            const isTruncationMessage = line.id.startsWith("truncation-");
            return (
              <div
                className={cn(
                  "py-1 px-2",
                  index > 0 && "border-t border-border/40",
                )}
                key={line.id}
              >
                <div
                  className={cn(
                    "shrink-1 overflow-x-auto whitespace-pre-wrap break-all",
                    isTruncationMessage
                      ? "text-muted-foreground italic"
                      : line.type === "error"
                        ? "text-destructive"
                        : "text-foreground",
                  )}
                >
                  {line.message}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!isNearBottom && (
        <Button
          className="absolute right-4 bottom-4 shadow-lg border border-border"
          onClick={() => scrollToBottom()}
          size="icon"
          variant="secondary"
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
