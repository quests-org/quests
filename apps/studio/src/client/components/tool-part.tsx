import {
  getToolNameByType,
  type SessionMessagePart,
} from "@quests/workspace/client";
import { ChevronUp, TriangleAlert } from "lucide-react";
import { useState } from "react";

import {
  getToolDisplayName,
  getToolIcon,
  getToolStreamingDisplayName,
} from "../lib/tool-display";
import { cn } from "../lib/utils";
import { ReasoningMessage } from "./reasoning-message";
import { ToolDetailedOutput } from "./tool-part-detail";
import { Button } from "./ui/button";

interface ToolPartProps {
  isAgentRunning: boolean;
  part: SessionMessagePart.ToolPart;
}

export function ToolPart({ isAgentRunning, part }: ToolPartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolName = getToolNameByType(part.type);
  const ToolIcon = getToolIcon(toolName);

  const isLoading =
    (part.state === "input-streaming" || part.state === "input-available") &&
    isAgentRunning;
  const isError = part.state === "output-error";
  const isSuccess = part.state === "output-available";
  const isExpandable = isSuccess || isError; // Allow expansion for both success and error outputs

  let label: string;
  let value: string | undefined;

  if (isLoading) {
    label = getToolStreamingDisplayName(toolName);
    value = "";
  } else if (isError) {
    label = "Error";
    value = part.errorText;
  } else if (isSuccess && part.type !== "tool-think") {
    label = getToolDisplayName(toolName);
    value = getToolOutputDescription(part);
  } else {
    label = getToolDisplayName(toolName);
  }

  if (toolName === "think") {
    const text =
      part.state === "output-available" && part.type === "tool-think"
        ? part.output.thought || ""
        : "";
    const isStreaming =
      part.state === "input-streaming" || part.state === "input-available";

    return (
      <ReasoningMessage
        createdAt={part.metadata.createdAt}
        endedAt={
          part.state === "output-available" || part.state === "output-error"
            ? part.metadata.endedAt
            : undefined
        }
        isAgentRunning={isAgentRunning}
        isStreaming={isStreaming}
        text={text}
      />
    );
  }

  // Choose the appropriate icon
  const DisplayIcon = isError ? TriangleAlert : ToolIcon;

  const handleToggle = () => {
    if (isExpandable) {
      setIsExpanded(!isExpanded);
    }
  };

  const mainContent = (
    <div className="flex items-center gap-2 min-w-0 w-full text-xs leading-tight">
      {isLoading ? (
        <span className="shrink-0 text-accent-foreground/80">
          <div className="size-3 border border-current border-t-transparent rounded-full animate-spin" />
        </span>
      ) : (
        <span
          className={cn(
            "shrink-0 text-accent-foreground/80",
            isError && "text-warning-foreground/80",
          )}
        >
          <DisplayIcon className="size-3" />
        </span>
      )}

      <span
        className={cn(
          "text-foreground/60 font-medium shrink-0",
          isError && "text-warning-foreground/80",
          isLoading && "shiny-text",
        )}
      >
        {label}
      </span>
      {value && (
        <span
          className={cn(
            "text-muted-foreground/60 truncate min-w-0",
            isError && "text-warning-foreground/60",
            isLoading && "shiny-text",
          )}
        >
          {value}
        </span>
      )}
      {isExpandable && isExpanded && (
        <span className="shrink-0 text-accent-foreground/60 ml-auto">
          <ChevronUp className="size-3" />
        </span>
      )}
    </div>
  );

  return (
    <div className="w-full">
      {isExpandable ? (
        <Button
          className="h-6 p-0 w-full justify-start hover:bg-accent/30 rounded-sm"
          onClick={handleToggle}
          variant="ghost"
        >
          {mainContent}
        </Button>
      ) : (
        <div className="h-6 flex items-center">{mainContent}</div>
      )}

      {isExpanded && isSuccess && (
        <div className="mt-2 text-xs">
          <div className="p-2 bg-muted/30 rounded-md border max-h-64 overflow-y-auto">
            <ToolDetailedOutput part={part} />
          </div>
        </div>
      )}

      {isExpanded && isError && (
        <div className="mt-2 text-xs space-y-2">
          <div className="p-2 bg-muted/30 rounded-md border max-h-64 overflow-y-auto">
            <div className="mb-1 font-semibold">Error:</div>
            <pre className="whitespace-pre-wrap break-words font-mono text-xs">
              {part.errorText}
            </pre>
          </div>
          <div className="p-2 bg-muted/30 rounded-md border max-h-64 overflow-y-auto">
            <div className="mb-1 font-semibold">Input:</div>
            <pre className="whitespace-pre-wrap break-words font-mono text-xs">
              {JSON.stringify(part.rawInput, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function cleanFilePath(filePath: string): string {
  return filePath.replace(/^(?:\.\/)?src\//, "");
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
      return part.output.filePath
        ? cleanFilePath(part.output.filePath)
        : "file edited";
    }
    case "tool-file_tree": {
      return part.output.tree
        ? truncateText(part.output.tree, 50)
        : "files listed";
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
      return part.output.state === "exists"
        ? part.output.filePath
          ? cleanFilePath(part.output.filePath)
          : "file read"
        : part.output.filePath
          ? `${cleanFilePath(part.output.filePath)}: not found`
          : "file not found";
    }
    case "tool-run_diagnostics": {
      const errorCount = part.output.errors.length;
      return errorCount > 0
        ? `${errorCount} error${errorCount === 1 ? "" : "s"} found`
        : "no errors found";
    }
    case "tool-run_git_commands": {
      const results = part.output.results;
      return (
        results.map((result) => result.command).join(", ") ||
        "git commands executed"
      );
    }
    case "tool-run_shell_command": {
      return part.output.command || "command executed";
    }
    case "tool-unavailable": {
      return "";
    }
    case "tool-write_file": {
      return part.output.filePath
        ? cleanFilePath(part.output.filePath)
        : "file written";
    }
    default: {
      const _exhaustiveCheck: never = part;
      // eslint-disable-next-line no-console
      console.warn("Unknown tool", _exhaustiveCheck);
      return "completed";
    }
  }
}

function truncateText(text: string, maxLength = 100) {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "...";
}
