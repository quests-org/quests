import { cn } from "@/client/lib/utils";
import { type AppSubdomain } from "@quests/workspace/client";
import { useSetAtom } from "jotai";
import { ChevronDown, Copy, MessageSquare, Trash, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";

import { promptValueAtomFamily } from "../atoms/prompt-value";
import { type RPCOutput } from "../rpc/client";
import { ConfirmedIconButton } from "./confirmed-icon-button";
import { Badge } from "./ui/badge";
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

interface GroupedLogLine {
  count: number;
  line: LogLine;
  originalIndex: number;
}

type LogLine = RPCOutput["workspace"]["runtime"]["log"]["list"][number];

export function Console({
  logs,
  onClearLogs,
  onCollapse,
  showSendToChat = false,
  subdomain,
}: {
  logs: LogLine[];
  onClearLogs: () => void;
  onCollapse: () => void;
  showSendToChat?: boolean;
  subdomain: AppSubdomain;
}) {
  const { contentRef, isNearBottom, scrollRef, scrollToBottom } =
    useStickToBottom({ initial: "instant", mass: 0.8 });

  const groupedLogs = useMemo(() => groupConsecutiveDuplicates(logs), [logs]);

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
          {groupedLogs.map((group, index) => {
            return (
              <ConsoleRow
                count={group.count}
                index={index}
                key={group.line.id}
                line={group.line}
                showSendToChat={showSendToChat}
                subdomain={subdomain}
              />
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

function ConsoleRow({
  count,
  index,
  line,
  showSendToChat,
  subdomain,
}: {
  count: number;
  index: number;
  line: LogLine;
  showSendToChat?: boolean;
  subdomain: AppSubdomain;
}) {
  const setPromptValue = useSetAtom(promptValueAtomFamily(subdomain));

  const handleCopy = async () => {
    await navigator.clipboard.writeText(line.message);
  };

  const handleSendToChat = () => {
    setPromptValue((prev) =>
      prev ? `${prev}\n\n${line.message}` : line.message,
    );
  };

  return (
    <div
      className={cn(
        "group py-0.5 px-2 relative",
        index > 0 && "border-t border-border/40",
      )}
    >
      <div className="flex items-start gap-1">
        {count > 1 && (
          <Badge
            className="text-[10px] px-1 py-0 h-4 min-w-[16px] flex items-center justify-center shrink-0 tabular-nums mt-0.5"
            variant="secondary"
          >
            {count}
          </Badge>
        )}

        <div className="flex-1 min-w-0">
          {line.type === "truncation" ? (
            <div className="text-muted-foreground italic bg-muted/30 px-2 py-0.5 rounded-sm shrink-1 overflow-x-auto whitespace-pre-wrap break-all">
              {line.message}
            </div>
          ) : (
            <TruncatedLogLine line={line} />
          )}
        </div>
      </div>

      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {showSendToChat && (
          <ConfirmedIconButton
            icon={MessageSquare}
            onClick={handleSendToChat}
            successTooltip="Sent to chat!"
            tooltip="Send to chat"
          />
        )}

        <ConfirmedIconButton
          icon={Copy}
          onClick={handleCopy}
          successTooltip="Copied!"
          tooltip="Copy"
        />
      </div>
    </div>
  );
}

function groupConsecutiveDuplicates(logs: LogLine[]): GroupedLogLine[] {
  if (logs.length === 0) {
    return [];
  }

  const grouped: GroupedLogLine[] = [];
  const firstLog = logs[0];
  if (!firstLog) {
    return [];
  }

  let currentGroup: GroupedLogLine = {
    count: 1,
    line: firstLog,
    originalIndex: 0,
  };

  for (let i = 1; i < logs.length; i++) {
    const current = logs[i];
    if (!current) {
      continue;
    }

    const previous = currentGroup.line;

    if (
      current.message === previous.message &&
      current.type === previous.type
    ) {
      currentGroup.count++;
    } else {
      grouped.push(currentGroup);
      currentGroup = {
        count: 1,
        line: current,
        originalIndex: i,
      };
    }
  }

  grouped.push(currentGroup);
  return grouped;
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
