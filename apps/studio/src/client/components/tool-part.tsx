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
  isLoading: boolean;
  part: SessionMessagePart.ToolPart;
}

export function ToolPart({ isLoading, part }: ToolPartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolName = getToolNameByType(part.type);
  const ToolIcon = getToolIcon(toolName);

  const isError = part.state === "output-error";
  const isSuccess = part.state === "output-available";
  const isExpandable = isSuccess || isError; // Allow expansion for both success and error outputs

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
        // Will be handled below
        label = getToolDisplayName(toolName);
        value = truncateText(part.output.thought, 80);
      } else {
        label = getToolDisplayName(toolName);
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
            <pre className="whitespace-pre-wrap wrap-break-word font-mono text-xs">
              {part.errorText}
            </pre>
          </div>
          <div className="p-2 bg-muted/30 rounded-md border max-h-64 overflow-y-auto">
            <div className="mb-1 font-semibold">Input:</div>
            <pre className="whitespace-pre-wrap wrap-break-word font-mono text-xs">
              {JSON.stringify(part.input || part.rawInput, null, 2)}
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
      return part.input.filePath
        ? cleanFilePath(part.input.filePath)
        : undefined;
    }
    case "tool-file_tree": {
      return undefined;
    }
    case "tool-glob": {
      return part.input.pattern;
    }
    case "tool-grep": {
      return part.input.pattern;
    }
    case "tool-read_file": {
      return cleanFilePath(part.input.filePath);
    }
    case "tool-run_diagnostics": {
      return undefined;
    }
    case "tool-run_git_commands": {
      const commands = part.input.commands;
      return commands.join(", ");
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
      return cleanFilePath(part.input.filePath);
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
      if (part.output.state === "exists") {
        return part.output.filePath
          ? cleanFilePath(part.output.filePath)
          : "file";
      }
      if (part.output.state === "image") {
        return part.output.filePath
          ? cleanFilePath(part.output.filePath)
          : "image";
      }
      if (part.output.state === "pdf") {
        return part.output.filePath
          ? cleanFilePath(part.output.filePath)
          : "pdf";
      }
      return part.output.filePath
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
