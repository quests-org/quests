import {
  getToolNameByType,
  type ProjectSubdomain,
  type SessionMessagePart,
} from "@quests/workspace/client";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";

import { filenameFromFilePath } from "../../lib/file-utils";
import { getToolLabel, getToolStreamingLabel } from "../../lib/tool-display";
import { cn } from "../../lib/utils";
import {
  CollapsiblePartMainContent,
  CollapsiblePartTrigger,
  ToolCallItem,
} from "../collapsible-part";
import { ReasoningMessage } from "../reasoning-message";
import { ToolIcon } from "../tool-icon";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { ToolPartExpanded } from "./expanded";
import { FileModification } from "./file-modification";
import { ShellCommandCard } from "./shell-command-card";

export function ToolPart({
  isLoading,
  part,
  projectSubdomain,
}: {
  isLoading: boolean;
  part: SessionMessagePart.ToolPart;
  projectSubdomain: ProjectSubdomain;
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

  // Use dedicated components for file modification and shell commands
  if (part.type === "tool-edit_file" || part.type === "tool-write_file") {
    return <FileModification isLoading={isLoading} part={part} />;
  }

  if (part.type === "tool-run_shell_command") {
    return (
      <ShellCommandCard
        isLoading={isLoading}
        part={part}
        projectSubdomain={projectSubdomain}
      />
    );
  }

  let label: string;
  let value: string | undefined;

  switch (part.state) {
    case "input-available": {
      value = getToolInputValue(part) || "";
      label = getToolStreamingLabel(toolName, !!value);
      break;
    }
    case "input-streaming": {
      value = getToolInputValue(part) || "";
      label = getToolStreamingLabel(toolName, !!value);
      break;
    }
    case "output-available": {
      if (part.type === "tool-think") {
        label = getToolLabel(toolName);
        value = truncateText(part.output.thought, 80);
      } else {
        label = getToolLabel(toolName);
        value = getToolOutputDescription(part);
      }
      break;
    }
    case "output-error": {
      label = getToolLabel(toolName);
      value = part.errorText;
      break;
    }
    default: {
      label = getToolLabel(toolName);
      value = getToolInputValue(part);
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
    <ToolCallItem
      icon={
        isLoading ? (
          <Loader2Icon className="size-3 animate-spin" />
        ) : (
          <ToolIcon className="size-3" toolName={toolName} />
        )
      }
      isExpanded={isExpandable && isExpanded}
      label={label}
      labelClassName={cn(isLoading && "shiny-text")}
      value={value}
    />
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
          <CollapsiblePartMainContent>
            <ToolPartExpanded part={part} />
          </CollapsiblePartMainContent>
        )}

        {isError && (
          <div className="mt-2 space-y-2 text-xs">
            <CollapsiblePartMainContent>
              <div className="mb-1 font-semibold">Error:</div>
              <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap">
                {isFileNotFound &&
                  `File not found: ${part.output.filePath || ""}`}
                {!isFileNotFound &&
                  part.state === "output-error" &&
                  part.errorText}
              </pre>
            </CollapsiblePartMainContent>
            <CollapsiblePartMainContent>
              <div className="mb-1 font-semibold">Input:</div>
              <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap">
                {JSON.stringify(part.input, null, 2)}
              </pre>
            </CollapsiblePartMainContent>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function getToolInputValue(
  part: Extract<
    SessionMessagePart.ToolPart,
    { state: "input-available" | "input-streaming" }
  >,
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
        ? filenameFromFilePath(part.input.filePath)
        : undefined;
    }
    case "tool-glob": {
      return part.input.pattern;
    }
    case "tool-grep": {
      return part.input.pattern;
    }
    case "tool-read_file": {
      return part.input.filePath
        ? filenameFromFilePath(part.input.filePath)
        : undefined;
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
      return part.input.filePath
        ? filenameFromFilePath(part.input.filePath)
        : undefined;
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
      return part.output.state === "does-not-exist"
        ? `file not found: ${part.output.filePath}`
        : filenameFromFilePath(part.output.filePath);
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
