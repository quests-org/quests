import { cn } from "@/client/lib/utils";
import { type ConsoleLogType } from "@quests/shared/shim";
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
export interface ClientLogLine {
  createdAt: Date;
  id: string;
  message: string;
  type: ConsoleLogType;
}

type ServerLogLine = RPCOutput["workspace"]["runtime"]["log"]["list"][number];

type UnifiedLogLine =
  | (ClientLogLine & { source: "client" })
  | (ServerLogLine & { source: "server" });

const getLogLineStyles = (log: UnifiedLogLine) => {
  const baseStyles =
    "shrink-1 overflow-x-auto whitespace-pre-wrap break-all px-2 py-0.5 rounded-sm";

  const type = log.type;

  if (type === "error") {
    return cn(baseStyles, "bg-destructive/5 text-destructive");
  }

  if (type === "warn") {
    return cn(
      baseStyles,
      "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
    );
  }

  return cn(baseStyles, "bg-muted/30 text-foreground");
};

interface GroupedLogLine {
  count: number;
  line: UnifiedLogLine;
  originalIndex: number;
}

export function Console({
  clientLogs,
  logs,
  onClearLogs,
  onCollapse,
  showSendToChat = false,
  subdomain,
}: {
  clientLogs: ClientLogLine[];
  logs: ServerLogLine[];
  onClearLogs: () => void;
  onCollapse: () => void;
  showSendToChat?: boolean;
  subdomain: AppSubdomain;
}) {
  const { contentRef, isNearBottom, scrollRef, scrollToBottom } =
    useStickToBottom({ initial: "instant", mass: 0.8 });

  const unifiedLogs = useMemo(() => {
    const serverLogs: UnifiedLogLine[] = logs.map((log) => ({
      ...log,
      source: "server" as const,
    }));

    const clientLogsUnified: UnifiedLogLine[] = clientLogs.map((log) => ({
      ...log,
      source: "client" as const,
    }));

    const allLogs = [...serverLogs, ...clientLogsUnified];

    allLogs.sort((a, b) => {
      const aTimeMs =
        a.createdAt instanceof Date
          ? a.createdAt.getTime()
          : new Date(a.createdAt).getTime();
      const bTimeMs =
        b.createdAt instanceof Date
          ? b.createdAt.getTime()
          : new Date(b.createdAt).getTime();
      return aTimeMs - bTimeMs;
    });

    return allLogs;
  }, [logs, clientLogs]);

  const groupedLogs = useMemo(
    () => groupConsecutiveDuplicates(unifiedLogs),
    [unifiedLogs],
  );

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
          className="absolute left-1/2 -translate-x-1/2 bottom-4 shadow-lg border border-border h-6 w-6 p-0"
          onClick={() => scrollToBottom()}
          variant="secondary"
        >
          <ChevronDown className="h-2 w-2" />
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
  line: UnifiedLogLine;
  showSendToChat?: boolean;
  subdomain: AppSubdomain;
}) {
  const setPromptValue = useSetAtom(promptValueAtomFamily(subdomain));

  const message = line.message;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
  };

  const handleSendToChat = () => {
    const sourceLabel = line.source === "server" ? "Server" : "Browser";
    const contextualMessage = `[${sourceLabel}] ${message}`;
    setPromptValue((prev) =>
      prev ? `${prev}\n\n${contextualMessage}` : contextualMessage,
    );
  };

  return (
    <div
      className={cn(
        "group py-px px-2 relative border-l-2",
        index > 0 && "border-t border-border/40",
        line.source === "server"
          ? "border-l-blue-200 dark:border-l-blue-800"
          : "border-l-green-200 dark:border-l-green-800",
      )}
    >
      <div className="flex items-start gap-1">
        <Badge
          className={cn(
            "text-[10px] px-1 py-0 h-4 min-w-[20px] flex items-center justify-center shrink-0 mt-0.5",
            line.source === "server"
              ? "text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/50 dark:border-blue-800"
              : "text-green-700 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/50 dark:border-green-800",
          )}
          variant="secondary"
        >
          {line.source === "server" ? "Server" : "Browser"}
        </Badge>

        {count > 1 && (
          <Badge
            className="text-[10px] px-1 py-0 h-4 min-w-[16px] flex items-center justify-center shrink-0 tabular-nums mt-0.5"
            variant="secondary"
          >
            {count}
          </Badge>
        )}

        <div className="flex-1 min-w-0">
          {line.source === "server" && line.type === "truncation" ? (
            <div className="text-muted-foreground italic bg-muted/30 px-2 py-0.5 rounded-sm shrink-1 overflow-x-auto whitespace-pre-wrap break-all">
              {message}
            </div>
          ) : (
            <TruncatedLogLine line={line} message={message} />
          )}
        </div>
      </div>

      <div className="absolute right-2 top-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {showSendToChat && (
          <ConfirmedIconButton
            className="size-5 bg-background hover:!bg-accent dark:hover:!bg-accent border border-border/50"
            icon={MessageSquare}
            onClick={handleSendToChat}
            successTooltip="Sent to chat!"
            tooltip="Send to chat"
            variant="ghost"
          />
        )}

        <ConfirmedIconButton
          className="size-5 bg-background hover:!bg-accent dark:hover:!bg-accent border border-border/50"
          icon={Copy}
          onClick={handleCopy}
          successTooltip="Copied!"
          tooltip="Copy"
          variant="ghost"
        />
      </div>
    </div>
  );
}

function groupConsecutiveDuplicates(logs: UnifiedLogLine[]): GroupedLogLine[] {
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
      current.type === previous.type &&
      current.source === previous.source
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

function TruncatedLogLine({
  line,
  message,
}: {
  line: UnifiedLogLine;
  message: string;
}) {
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
    return <div className={getLogLineStyles(line)}>{message}</div>;
  }

  return (
    <div className={getLogLineStyles(line)}>
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
