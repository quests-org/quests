import { cn } from "@/client/lib/utils";
import { ChevronDown, Trash, X } from "lucide-react";
import { useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";

import { type RPCOutput } from "../rpc/client";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const MAX_LINE_LENGTH = 200;
const MAX_LINES = 2;

const getLogLineStyles = (type: LogLine["type"]) => {
  return cn(
    "shrink-1 overflow-x-auto whitespace-pre-wrap break-all px-2 py-0.5 rounded-sm",
    type === "error"
      ? "bg-destructive/5 text-destructive"
      : "bg-muted/30 text-foreground",
  );
};

interface ConsoleProps {
  logs: RPCOutput["workspace"]["runtime"]["log"]["list"];
  onClearLogs: () => void;
  onCollapse: () => void;
}

type LogLine = RPCOutput["workspace"]["runtime"]["log"]["list"][number];

export function Console({ logs, onClearLogs, onCollapse }: ConsoleProps) {
  const { contentRef, isNearBottom, scrollRef, scrollToBottom } =
    useStickToBottom({ initial: "instant", mass: 0.8 });

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
            onClick={onCollapse}
            size="icon"
            variant="ghost"
          >
            <X />
          </Button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto min-h-0 bg-muted/50"
        ref={scrollRef}
      >
        <div
          className="flex flex-col border-border font-mono text-xs"
          ref={contentRef}
        >
          {logs.map((line, index) => {
            return (
              <div
                className={cn(
                  "py-0.5 px-2",
                  index > 0 && "border-t border-border/40",
                )}
                key={line.id}
              >
                {line.type === "truncation" ? (
                  <div className="text-muted-foreground italic bg-muted/30 px-2 py-0.5 rounded-sm shrink-1 overflow-x-auto whitespace-pre-wrap break-all">
                    {line.message}
                  </div>
                ) : (
                  <TruncatedLogLine line={line} />
                )}
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

function TruncatedLogLine({ line: { message, type } }: { line: LogLine }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const lines = message.split("\n");
  const exceedsLineCount = lines.length > MAX_LINES;
  const exceedsCharLength = message.length > MAX_LINE_LENGTH;
  const needsTruncation = exceedsLineCount || exceedsCharLength;

  let displayMessage = message;
  if (needsTruncation && !isExpanded) {
    if (exceedsLineCount) {
      displayMessage = lines.slice(0, MAX_LINES).join("\n");
    } else if (exceedsCharLength) {
      displayMessage = message.slice(0, MAX_LINE_LENGTH);
    }
  }

  if (!needsTruncation) {
    return <div className={getLogLineStyles(type)}>{message}</div>;
  }

  return (
    <div className={getLogLineStyles(type)}>
      <button
        className="text-muted-foreground hover:text-foreground transition-colors mr-1 font-mono"
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
        type="button"
      >
        {isExpanded ? "▼" : "▶"}
      </button>
      {displayMessage}
    </div>
  );
}
