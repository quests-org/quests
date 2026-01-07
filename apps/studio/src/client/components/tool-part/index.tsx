import {
  getToolNameByType,
  type SessionMessagePart,
} from "@quests/workspace/client";
import { ChevronUp, Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";

import {
  getToolDisplayName,
  getToolStreamingDisplayName,
} from "../../lib/tool-display";
import { cn } from "../../lib/utils";
import { CollapsiblePartTrigger } from "../collapsible-part-trigger";
import { ReasoningMessage } from "../reasoning-message";
import { ToolIcon } from "../tool-icon";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { ToolPartExpanded } from "./expanded";

export function ToolPart({
  isLoading,
  part,
}: {
  isLoading: boolean;
  part: SessionMessagePart.ToolPart;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolName = getToolNameByType(part.type);

  const isFileNotFound =
    part.state === "output-available" &&
    part.type === "tool-read_file" &&
    part.output.state === "does-not-exist";
  const isError = part.state === "output-error" || isFileNotFound;
  const isSuccess = part.state === "output-available" && !isFileNotFound;
  const isExpandable = isSuccess || isError;

  let label: string;
  let value: string | undefined;

  switch (part.state) {
    case "input-available": {
      label = getToolStreamingDisplayName(toolName);
      value = getToolInputDescription(part) || "";
      break;
    }
    case "input-streaming": {
      label = getToolStreamingDisplayName(toolName);
      value = "";
      break;
    }
    case "output-available": {
      if (part.type === "tool-think") {
        label = getToolDisplayName(toolName);
        value = truncateText(part.output.thought, 80);
      } else {
        label = isFileNotFound ? "Read failed" : getToolDisplayName(toolName);
        value = getToolOutputDescription(part);
      }
      break;
    }
    case "output-error": {
      label = "Error";
      value = part.errorText;
      break;
    }
    default: {
      label = getToolDisplayName(toolName);
      value = getToolInputDescription(part);
    }
  }

  if (toolName === "think") {
    const text =
      part.state === "output-available" && part.type === "tool-think"
        ? part.output.thought || ""
        : "";

    return (
      <ReasoningMessage
        createdAt={part.metadata.createdAt}
        endedAt={
          part.state === "output-available" || part.state === "output-error"
            ? part.metadata.endedAt
            : undefined
        }
        isLoading={isLoading}
        text={text}
      />
    );
  }

  const mainContent = (
    <div className="flex w-full min-w-0 items-center gap-2 text-xs leading-tight">
      <span
        className={cn(
          "shrink-0 text-accent-foreground/80",
          isError && "text-warning-foreground/80",
        )}
      >
        {isLoading ? (
          <Loader2 className="size-3 animate-spin" />
        ) : isError ? (
          <TriangleAlert className="size-3" />
        ) : (
          <ToolIcon className="size-3" toolName={toolName} />
        )}
      </span>

      <span
        className={cn(
          "shrink-0 font-medium text-foreground/80",
          isError && "text-warning-foreground",
          isLoading && "shiny-text",
        )}
      >
        {label}
      </span>
      {value && (
        <span
          className={cn(
            "min-w-0 truncate text-foreground/60",
            isError && "text-warning-foreground/60",
          )}
        >
          {value}
        </span>
      )}
      {isExpandable && isExpanded && (
        <span className="ml-auto shrink-0 text-accent-foreground/60">
          <ChevronUp className="size-3" />
        </span>
      )}
    </div>
  );

  if (!isExpandable) {
    return (
      <div className="w-full">
        <div className="flex h-6 items-center px-1">{mainContent}</div>
      </div>
    );
  }

  return (
    <Collapsible
      className="w-full"
      onOpenChange={setIsExpanded}
      open={isExpanded}
    >
      <CollapsibleTrigger asChild>
        <CollapsiblePartTrigger>{mainContent}</CollapsiblePartTrigger>
      </CollapsibleTrigger>

      <CollapsibleContent>
        {isSuccess && (
          <div className="mt-2 text-xs">
            <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-2">
              <ToolPartExpanded part={part} />
            </div>
          </div>
        )}

        {isError && (
          <div className="mt-2 space-y-2 text-xs">
            <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-2">
              <div className="mb-1 font-semibold">Error:</div>
              <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap">
                {isFileNotFound &&
                  `File not found: ${part.output.filePath || ""}`}
                {!isFileNotFound &&
                  part.state === "output-error" &&
                  part.errorText}
              </pre>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-2">
              <div className="mb-1 font-semibold">Input:</div>
              <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap">
                {JSON.stringify(part.input, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function filenameFromFilePath(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

function getToolInputDescription(
  part: Extract<SessionMessagePart.ToolPart, { state: "input-available" }>,
): string | undefined {
  if (!part.input) {
    return undefined;
  }

  switch (part.type) {
    case "tool-choose": {
      return part.input.question;
    }
    case "tool-edit_file": {
      return filenameFromFilePath(part.input.filePath);
    }
    case "tool-glob": {
      return part.input.pattern;
    }
    case "tool-grep": {
      return part.input.pattern;
    }
    case "tool-read_file": {
      return filenameFromFilePath(part.input.filePath);
    }
    case "tool-run_diagnostics": {
      return undefined;
    }
    case "tool-run_shell_command": {
      return part.input.command;
    }
    case "tool-think": {
      return part.input.thought;
    }
    case "tool-unavailable": {
      return undefined;
    }
    case "tool-write_file": {
      return filenameFromFilePath(part.input.filePath);
    }
    default: {
      const _exhaustiveCheck: never = part;
      // eslint-disable-next-line no-console
      console.warn("Unknown tool", _exhaustiveCheck);
      return undefined;
    }
  }
}

function getToolOutputDescription(
  part: Extract<SessionMessagePart.ToolPart, { state: "output-available" }> & {
    type: Exclude<SessionMessagePart.ToolPart["type"], "tool-think">;
  },
): string {
  switch (part.type) {
    case "tool-choose": {
      return part.output.selectedChoice || "answered";
    }
    case "tool-edit_file": {
      return filenameFromFilePath(part.output.filePath) || "file edited";
    }
    case "tool-glob": {
      const files = part.output.files;
      return files.length === 0
        ? "No files found"
        : `${files.length} files found`;
    }
    case "tool-grep": {
      const matches = part.output.matches;
      return matches.length === 0
        ? "No matches found"
        : `${matches.length} matches found`;
    }
    case "tool-read_file": {
      return filenameFromFilePath(part.output.filePath) || "file missing";
    }
    case "tool-run_diagnostics": {
      const errorCount = part.output.errors.length;
      return errorCount > 0
        ? `${errorCount} error${errorCount === 1 ? "" : "s"} found`
        : "no errors found";
    }
    case "tool-run_shell_command": {
      return part.output.command || "command executed";
    }
    case "tool-unavailable": {
      return "";
    }
    case "tool-write_file": {
      return filenameFromFilePath(part.output.filePath) || "file written";
    }
    default: {
      const _exhaustiveCheck: never = part;
      // eslint-disable-next-line no-console
      console.warn("Unknown tool", _exhaustiveCheck);
      return (part as { type: string }).type;
    }
  }
}

function truncateText(text: string, maxLength = 100) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "...";
}
