import {
  getToolNameByType,
  type SessionMessagePart,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
import { Loader2Icon } from "lucide-react";
import { sift } from "radashi";
import { useState } from "react";

import { filenameFromFilePath } from "../../lib/path-utils";
import { getToolLabelForPart } from "../../lib/tool-display";
import { cn } from "../../lib/utils";
import {
  CollapsiblePartMainContent,
  CollapsiblePartTrigger,
} from "../collapsible-part";
import { Favicon } from "../favicon";
import { ToolIcon } from "../tool-icon";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { DeveloperModeBadge } from "./developer-mode-badge";
import { ToolPartExpanded } from "./expanded";
import { FileModification } from "./file-modification";
import { ToolPartListItemCompact } from "./list-item-compact";
import { ShellCommandCard } from "./shell-command-card";
import { type RenderStream, TaskToolCard } from "./task";

export function ToolPart({
  isDeveloperMode,
  isLoading,
  onRetry,
  part,
  project,
  renderStream,
}: {
  isDeveloperMode: boolean;
  isLoading: boolean;
  onRetry: (prompt: string) => void;
  part: SessionMessagePart.ToolPart;
  project: WorkspaceAppProject;
  renderStream: RenderStream;
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

  // Hide tool parts that haven't reached a terminal state and aren't loading,
  // unless developer mode is enabled.
  const hasTerminalState = isError || isSuccess;
  if (!hasTerminalState && !isLoading && !isDeveloperMode) {
    return null;
  }

  // In developer mode, show a collapsible indicator for dead tool calls
  // (not loading, no terminal state).
  if (!hasTerminalState && !isLoading && isDeveloperMode) {
    return (
      <Collapsible
        className="w-full"
        onOpenChange={setIsExpanded}
        open={isExpanded}
      >
        <CollapsibleTrigger asChild>
          <CollapsiblePartTrigger>
            <ToolPartListItemCompact
              icon={
                <span className="flex items-center gap-1">
                  <DeveloperModeBadge />
                  <ToolIcon className="size-3" toolName={toolName} />
                </span>
              }
              label={`${getToolLabelForPart({ part, state: "streaming", toolName })} stopped while`}
              value={<span>{part.state}</span>}
            />
          </CollapsiblePartTrigger>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CollapsiblePartMainContent>
            <div className="mb-1 font-semibold">
              State: <span className="font-mono">{part.state}</span>
            </div>
            <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap">
              {JSON.stringify(part.input, null, 2)}
            </pre>
          </CollapsiblePartMainContent>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Use dedicated components for file modification and shell commands
  if (
    !isError &&
    (part.type === "tool-edit_file" || part.type === "tool-write_file")
  ) {
    return <FileModification isLoading={isLoading} part={part} />;
  }

  if (part.type === "tool-bash") {
    return (
      <ShellCommandCard
        isLoading={isLoading}
        part={part}
        projectSubdomain={project.subdomain}
      />
    );
  }

  if (part.type === "tool-task") {
    return (
      <TaskToolCard
        isLoading={isLoading}
        part={part}
        project={project}
        renderStream={renderStream}
      />
    );
  }

  let label: string;
  let value: string | undefined;
  const isWebSearch = toolName === "web_search";
  // Omit explanation for web search, since the query is self evident.
  const reasoning = isWebSearch ? undefined : getExplanation(part.input);
  const hasCapabilityFailure = hasOutputFailureState(part);
  const isFailed = isError || hasCapabilityFailure;

  switch (part.state) {
    case "input-available": {
      value = getToolInputValue(part) || "";
      label = getToolLabelForPart({
        hasValue: !!value,
        part,
        state: "streaming",
        toolName,
      });
      break;
    }
    case "input-streaming": {
      value = getToolInputValue(part) || "";
      label = getToolLabelForPart({
        hasValue: !!value,
        part,
        state: "streaming",
        toolName,
      });
      break;
    }
    case "output-available": {
      label = getToolLabelForPart({
        hasCapabilityFailure,
        part,
        state: "completed",
        toolName,
      });
      value = getToolOutputDescription(part);
      break;
    }
    case "output-error": {
      label = getToolLabelForPart({ part, state: "failed", toolName });
      value = part.errorText;
      break;
    }
    default: {
      label = getToolLabelForPart({ part, state: "completed", toolName });
      value = getToolInputValue(part);
    }
  }

  if (isWebSearch && !isFailed) {
    const query = getWebSearchQuery(part);
    if (query) {
      value = `"${query}"`;
    }
  }

  const webSearchSources = getWebSearchSources(part);
  const generateImageSourceImages = getGenerateImageSourceImages(part);

  const mainContent = (
    <ToolPartListItemCompact
      icon={
        isLoading ? (
          <Loader2Icon className="size-3 animate-spin" />
        ) : isFailed ? undefined : (
          <ToolIcon className="size-3" toolName={toolName} />
        )
      }
      isExpanded={isExpandable && isExpanded}
      label={label}
      labelClassName={cn(isLoading && "shiny-text")}
      reasoning={reasoning}
      value={
        webSearchSources.length > 0 ? (
          <span className="flex items-center gap-1.5">
            <span className="truncate">{value}</span>
            <span className="flex shrink-0 items-center -space-x-1">
              {webSearchSources.slice(0, 4).map((source, index) => (
                <Favicon
                  className="size-3.5 ring-1 ring-background"
                  key={`${source.url}-${index}`}
                  url={source.url}
                />
              ))}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {webSearchSources.length} source
              {webSearchSources.length === 1 ? "" : "s"}
            </span>
          </span>
        ) : generateImageSourceImages.length > 0 ? (
          <span className="flex items-center gap-1.5">
            <span className="truncate">{value}</span>
            <span className="flex shrink-0 items-center -space-x-1">
              {generateImageSourceImages.slice(0, 4).map((filePath, index) => (
                <img
                  alt={filenameFromFilePath(filePath)}
                  className="size-3.5 rounded-sm object-cover ring-1 ring-background"
                  key={`${filePath}-${index}`}
                  src={`${project.urls.assetBase}/${filePath.startsWith("./") ? filePath.slice(2) : filePath}`}
                />
              ))}
            </span>
          </span>
        ) : (
          value
        )
      }
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
            <ToolPartExpanded onRetry={onRetry} part={part} project={project} />
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

function getExplanation(input: unknown): string | undefined {
  if (input && typeof input === "object" && "explanation" in input) {
    const explanation = (input as { explanation?: unknown }).explanation;
    return typeof explanation === "string" ? explanation : undefined;
  }
  return undefined;
}

function getGenerateImageSourceImages(
  part: SessionMessagePart.ToolPart,
): string[] {
  if (
    part.type === "tool-generate_image" &&
    part.input?.sourceImages &&
    part.input.sourceImages.length > 0
  ) {
    // Skip paths without a 3+ character extension -- they may still be streaming
    // and would produce broken image requests on every character.
    return sift(part.input.sourceImages).filter((filePath) =>
      /\.[a-z]{3,}$/i.test(filePath),
    );
  }
  return [];
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
    case "tool-bash": {
      return part.input.command;
    }
    case "tool-choose": {
      return part.input.question;
    }
    case "tool-copy_to_project": {
      return part.input.pattern;
    }
    case "tool-edit_file": {
      return part.input.filePath
        ? filenameFromFilePath(part.input.filePath)
        : undefined;
    }
    case "tool-generate_image": {
      if (!part.input.filePath) {
        return undefined;
      }
      const filename = filenameFromFilePath(part.input.filePath);
      const hasExtension = filename.includes(".");
      return hasExtension ? filename : `${filename} image`;
    }
    case "tool-glob": {
      return part.input.pattern;
    }
    case "tool-grep": {
      return part.input.pattern;
    }
    case "tool-load_skill": {
      return part.input.name;
    }
    case "tool-read_file": {
      return part.input.filePath
        ? filenameFromFilePath(part.input.filePath)
        : undefined;
    }
    case "tool-task": {
      return ""; // Empty because the explanation is in the summary
    }
    case "tool-unavailable": {
      return undefined;
    }
    case "tool-web_search": {
      return part.input.query;
    }
    case "tool-write_file": {
      return part.input.filePath
        ? filenameFromFilePath(part.input.filePath)
        : undefined;
    }
    default: {
      part satisfies never;
      // eslint-disable-next-line no-console
      console.warn("Unknown tool", part);
      return undefined;
    }
  }
}

function getToolOutputDescription(
  part: Extract<SessionMessagePart.ToolPart, { state: "output-available" }>,
): string {
  switch (part.type) {
    case "tool-bash": {
      return part.output.command || "command executed";
    }
    case "tool-choose": {
      return part.output.selectedChoice || "answered";
    }
    case "tool-copy_to_project": {
      const fileCount = part.output.files.length;
      const errorCount = part.output.errors.length;

      if (fileCount === 0 && errorCount === 0) {
        return "no files copied";
      }

      if (fileCount === 0 && errorCount > 0) {
        return `failed to copy ${errorCount} file${errorCount === 1 ? "" : "s"}`;
      }

      if (fileCount === 1 && errorCount === 0) {
        const [firstFile] = part.output.files;
        return firstFile
          ? filenameFromFilePath(firstFile.destinationPath)
          : "file copied";
      }

      const filesPart = `${fileCount} file${fileCount === 1 ? "" : "s"} copied`;
      const errorsPart = errorCount > 0 ? `, ${errorCount} failed` : "";
      return filesPart + errorsPart;
    }
    case "tool-edit_file": {
      return filenameFromFilePath(part.output.filePath) || "file edited";
    }
    case "tool-generate_image": {
      if (part.output.state === "failure") {
        return part.output.errorMessage;
      }
      const [firstImage] = part.output.images;
      if (part.output.images.length === 0) {
        return "No images generated";
      }
      if (part.output.images.length === 1 && firstImage) {
        const filename = filenameFromFilePath(firstImage.filePath);
        const hasExtension = filename.includes(".");
        return hasExtension ? filename : `${filename} image`;
      }
      return `${part.output.images.length} images generated`;
    }
    case "tool-glob": {
      const count = part.output.totalFiles ?? part.output.files.length;
      return count === 0 ? "No files found" : `${count} files found`;
    }
    case "tool-grep": {
      const matches = part.output.matches;
      return matches.length === 0
        ? "No matches found"
        : `${matches.length} matches found`;
    }
    case "tool-load_skill": {
      return part.output.name;
    }
    case "tool-read_file": {
      if (part.output.state === "does-not-exist") {
        return `file not found: ${part.output.filePath}`;
      }
      const filename = filenameFromFilePath(part.output.filePath);
      if (part.output.state === "exists") {
        const endLine = part.output.offset + part.output.displayedLines - 1;
        const isPartial = part.output.offset > 1 || part.output.hasMoreLines;
        if (isPartial) {
          return `${filename} L${part.output.offset}-${endLine}`;
        }
      }
      return filename;
    }
    case "tool-task": {
      if (part.output.status === "done") {
        return part.output.summary;
      }
      return "running";
    }
    case "tool-unavailable": {
      return "";
    }
    case "tool-web_search": {
      if (part.output.state === "failure") {
        return part.output.errorMessage;
      }
      const sourceCount = part.output.sources.length;
      return sourceCount > 0
        ? `${sourceCount} source${sourceCount === 1 ? "" : "s"} found`
        : "searched the web";
    }
    case "tool-write_file": {
      return filenameFromFilePath(part.output.filePath) || "file written";
    }
    default: {
      const _exhaustiveCheck: never = part;
      // eslint-disable-next-line no-console
      console.warn("Unknown tool", _exhaustiveCheck);
      const type =
        typeof (_exhaustiveCheck as { type?: unknown }).type === "string"
          ? (_exhaustiveCheck as { type: string }).type
          : "unknown";
      return type.startsWith("tool-") ? type.slice("tool-".length) : type;
    }
  }
}

function getWebSearchQuery(
  part: SessionMessagePart.ToolPart,
): string | undefined {
  if (part.type === "tool-web_search" && part.input?.query) {
    return part.input.query;
  }
  return undefined;
}

function getWebSearchSources(
  part: SessionMessagePart.ToolPart,
): { url: string }[] {
  if (
    part.type === "tool-web_search" &&
    part.state === "output-available" &&
    part.output.state === "success"
  ) {
    return part.output.sources;
  }
  return [];
}

function hasOutputFailureState(part: SessionMessagePart.ToolPart): boolean {
  if (part.state !== "output-available") {
    return false;
  }
  if (part.type === "tool-web_search" || part.type === "tool-generate_image") {
    return part.output.state === "failure";
  }
  return false;
}
