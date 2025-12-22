import { cn } from "@/client/lib/utils";
import { type ConsoleLogType } from "@quests/shared/shim";
import { type WorkspaceApp } from "@quests/workspace/client";
import { getDefaultStore, type SetStateAction, type WritableAtom } from "jotai";
import { ChevronDown, Copy, MessageSquare, Trash, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";

import { promptValueAtomFamily } from "../atoms/prompt-value";
import { type RPCOutput } from "../rpc/client";
import { ConfirmedIconButton } from "./confirmed-icon-button";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
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
    "shrink overflow-x-auto whitespace-pre-wrap break-all py-0.5 rounded-sm";

  const type = log.type;

  if (type === "error") {
    return {
      message: cn(baseStyles, "text-destructive"),
      row: "bg-destructive/5",
    };
  }

  if (type === "warn") {
    return {
      message: cn(baseStyles, "text-yellow-800 dark:text-yellow-300"),
      row: "bg-yellow-50 dark:bg-yellow-900/20",
    };
  }

  return {
    message: cn(baseStyles, "text-foreground"),
    row: "",
  };
};

interface GroupedLogLine {
  count: number;
  line: UnifiedLogLine;
  originalIndex: number;
}

export function Console({
  app,
  clientLogs,
  logs,
  onClearLogs,
  onCollapse,
}: {
  app: WorkspaceApp;
  clientLogs: ClientLogLine[];
  logs: ServerLogLine[];
  onClearLogs: () => void;
  onCollapse: () => void;
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
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-b-lg bg-background">
      <div className="flex h-fit w-full flex-row items-center justify-between border-b border-border bg-background px-2 py-1.5">
        <div className="text-xs">Console</div>
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
        className="min-h-0 flex-1 overflow-y-auto bg-muted/50"
        ref={scrollRef}
      >
        <div
          className="flex flex-col border-border font-mono text-xs"
          ref={contentRef}
        >
          {groupedLogs.map((group, index) => {
            return (
              <ConsoleRow
                app={app}
                count={group.count}
                index={index}
                key={group.line.id}
                line={group.line}
              />
            );
          })}
        </div>
      </div>

      {!isNearBottom && (
        <Button
          className="absolute bottom-4 left-1/2 h-6 w-6 -translate-x-1/2 border border-border p-0 shadow-lg"
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
  app,
  count,
  index,
  line,
}: {
  app: WorkspaceApp;
  count: number;
  index: number;
  line: UnifiedLogLine;
}) {
  const message = line.message;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
  };

  const handleSendToChat = async () => {
    if (app.type !== "project") {
      return;
    }
    const sourceLabel = line.source === "server" ? "Server" : "Browser";
    const contextualMessage = `[${sourceLabel}] ${message}`;
    const defaultStore = getDefaultStore();
    const atom = promptValueAtomFamily(app.subdomain);
    const prevPromptValue = await Promise.resolve(defaultStore.get(atom));
    defaultStore.set(
      atom as WritableAtom<string, [SetStateAction<string>], void>,
      prevPromptValue
        ? `${prevPromptValue}\n\n${contextualMessage}`
        : contextualMessage,
    );
  };

  const styles = getLogLineStyles(line);

  return (
    <div
      className={cn(
        "group relative border-l-2 px-1 py-px",
        index > 0 && "border-t border-border/40",
        line.source === "server"
          ? "border-l-blue-200 dark:border-l-blue-800"
          : "border-l-green-200 dark:border-l-green-800",
        styles.row,
      )}
    >
      <div className="flex items-start gap-1.5">
        <Badge
          className={cn(
            "mt-0.5 flex h-4 min-w-[52px] shrink-0 items-center justify-center px-1 py-0 text-[10px]",
            line.source === "server"
              ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
              : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/50 dark:text-green-300",
          )}
          variant="secondary"
        >
          {line.source === "server" ? "Server" : "Browser"}
        </Badge>

        {count > 1 && (
          <Badge
            className="mt-0.5 flex h-4 min-w-[16px] shrink-0 items-center justify-center px-1 py-0 text-[10px] tabular-nums"
            variant="secondary"
          >
            {count}
          </Badge>
        )}

        <div className="min-w-0 flex-1">
          {line.source === "server" && line.type === "truncation" ? (
            <div className="shrink overflow-x-auto rounded-sm px-2 py-0.5 break-all whitespace-pre-wrap text-muted-foreground italic">
              {message}
            </div>
          ) : (
            <TruncatedLogLine message={message} styles={styles} />
          )}
        </div>
      </div>

      <div className="absolute top-0.5 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {app.type === "project" && (
          <ConfirmedIconButton
            className="size-5 border border-border/50 bg-background hover:bg-accent! dark:hover:bg-accent!"
            icon={MessageSquare}
            onClick={handleSendToChat}
            successTooltip="Sent to chat!"
            tooltip="Send to chat"
            variant="ghost"
          />
        )}

        <ConfirmedIconButton
          className="size-5 border border-border/50 bg-background hover:bg-accent! dark:hover:bg-accent!"
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
  message,
  styles,
}: {
  message: string;
  styles: { message: string; row: string };
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const lines = message.split("\n");
  const exceedsLineCount = lines.length > MAX_LINES;
  const exceedsCharLength = message.length > MAX_LINE_LENGTH;
  const needsTruncation = exceedsLineCount || exceedsCharLength;

  if (!needsTruncation) {
    return <div className={styles.message}>{message}</div>;
  }

  let truncatedMessage = message;
  if (exceedsLineCount) {
    truncatedMessage = lines.slice(0, MAX_LINES).join("\n");
  } else if (exceedsCharLength) {
    truncatedMessage = message.slice(0, MAX_LINE_LENGTH);
  }

  return (
    <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
      <div className={styles.message}>
        <CollapsibleTrigger asChild>
          <button
            className="mr-1 font-mono text-muted-foreground transition-colors hover:text-foreground"
            type="button"
          >
            {isExpanded ? "▼" : "▶"}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="inline">{message}</CollapsibleContent>
        {!isExpanded && truncatedMessage}
      </div>
    </Collapsible>
  );
}
