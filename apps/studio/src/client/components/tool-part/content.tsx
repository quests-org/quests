import {
  formatBytes,
  type SessionMessagePart,
  type WorkspaceAppProject,
} from "@quests/workspace/client";

import { AIProviderIcon } from "../ai-provider-icon";
import { ExternalLink } from "../external-link";
import { Favicon } from "../favicon";
import { SessionMarkdown } from "../session-markdown";
import { Badge } from "../ui/badge";
import { ToolCapabilityFailure } from "./capability-failure";
import { CodeBlock } from "./code-block";
import { ToolPartFilePath } from "./file-path";
import { MonoText } from "./mono-text";
import { ToolPartReadFile } from "./read-file";
import { ScrollableCodeBlock } from "./scrollable-code-block";
import { SectionHeader } from "./section-header";
import { ToolPartTask } from "./task";

export function ToolContent({
  onRetry,
  part,
  project,
}: {
  onRetry?: (message: string) => void;
  part: Extract<SessionMessagePart.ToolPart, { state: "output-available" }>;
  project: WorkspaceAppProject;
}) {
  switch (part.type) {
    case "tool-choose": {
      return (
        <div>
          <SectionHeader>Question</SectionHeader>
          <div className="mb-2 text-sm">{part.input.question}</div>
          <SectionHeader>Choices</SectionHeader>
          <div className="mb-2 space-y-1">
            {part.input.choices.map((choice, index) => (
              <MonoText className="text-xs" key={index}>
                {choice}
              </MonoText>
            ))}
          </div>
          <SectionHeader>Selected choice</SectionHeader>
          <MonoText className="font-semibold">
            {part.output.selectedChoice}
          </MonoText>
        </div>
      );
    }
    case "tool-copy_to_project": {
      return (
        <div>
          <SectionHeader>Pattern: {part.input.pattern}</SectionHeader>
          {(part.input.maxFileSizeBytes !== undefined ||
            part.input.maxTotalSizeBytes !== undefined) && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {part.input.maxFileSizeBytes !== undefined && (
                <Badge variant="outline">
                  File limit: {formatBytes(part.input.maxFileSizeBytes)}
                </Badge>
              )}
              {part.input.maxTotalSizeBytes !== undefined && (
                <Badge variant="outline">
                  Batch limit: {formatBytes(part.input.maxTotalSizeBytes)}
                </Badge>
              )}
            </div>
          )}
          {part.output.files.length > 0 && (
            <div className="space-y-0.5">
              {part.output.files.map((file, index) => (
                <MonoText className="text-xs" key={index}>
                  {file.destinationPath} ({formatBytes(file.size)})
                </MonoText>
              ))}
            </div>
          )}
          {part.output.truncated && (
            <div className="mt-2 text-xs text-muted-foreground">
              {part.output.truncatedCount} file
              {part.output.truncatedCount === 1 ? "" : "s"} not copied. Batch
              limit reached.
            </div>
          )}
          {part.output.errors.length > 0 && (
            <div className="mt-2">
              <SectionHeader>
                {part.output.errors.length} error
                {part.output.errors.length === 1 ? "" : "s"}
              </SectionHeader>
              <div className="space-y-1">
                {part.output.errors.map((error, index) => (
                  <div
                    className="border-l-2 border-red-300 pl-2 font-mono text-xs dark:border-red-600"
                    key={index}
                  >
                    <div className="text-muted-foreground">
                      {error.sourcePath}
                    </div>
                    <div className="text-red-600 dark:text-red-400">
                      {error.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    case "tool-edit_file": {
      return (
        <div>
          <ToolPartFilePath
            filePath={part.output.filePath}
            label="File edited"
          />
          {part.input.oldString && (
            <div className="mt-2">
              <SectionHeader>Search pattern</SectionHeader>
              <ScrollableCodeBlock>{part.input.oldString}</ScrollableCodeBlock>
            </div>
          )}
          {part.input.newString && (
            <div className="mt-2">
              <SectionHeader>Replacement</SectionHeader>
              <ScrollableCodeBlock>{part.input.newString}</ScrollableCodeBlock>
            </div>
          )}
          {part.input.replaceAll && (
            <div className="mt-1">
              <Badge variant="secondary">Replace All</Badge>
            </div>
          )}
        </div>
      );
    }
    case "tool-generate_image": {
      if (part.output.state === "failure") {
        return (
          <ToolCapabilityFailure
            capabilityLabel="image generation"
            errorMessage={part.output.errorMessage}
            onRetry={onRetry}
            providerGuardDescription="Sign up for Quests or add an AI provider that supports image generation."
            responseBody={part.output.responseBody}
            retryMessage={`I added an image generation provider. Retry generating an image with "${part.input.prompt}"`}
          />
        );
      }
      const imageCount = part.output.images.length;
      return (
        <div>
          <div className="mb-3 flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Model:</span>
            <AIProviderIcon
              className="size-3.5"
              displayName={part.output.provider.displayName}
              showTooltip
              type={part.output.provider.type}
            />
            <MonoText className="text-xs">{part.output.modelId}</MonoText>
          </div>
          <SectionHeader>
            {imageCount === 1
              ? "Generated image"
              : `Generated ${imageCount} images`}
          </SectionHeader>
          <div className="space-y-1">
            {part.output.images.map((image, index) => {
              const dimensions =
                image.width && image.height
                  ? `, ${image.width}×${image.height}`
                  : "";
              return (
                <MonoText className="text-xs" key={index}>
                  {image.filePath} ({formatBytes(image.sizeBytes)}
                  {dimensions})
                </MonoText>
              );
            })}
          </div>
        </div>
      );
    }
    case "tool-glob": {
      const files = part.output.files;
      const totalFiles = part.output.totalFiles ?? files.length;
      const truncated = part.output.truncated ?? false;
      return (
        <div>
          <SectionHeader>
            Pattern:{" "}
            <MonoText className="inline">{part.input.pattern}</MonoText>
          </SectionHeader>
          {part.input.path && (
            <SectionHeader>
              Path: <MonoText className="inline">{part.input.path}</MonoText>
            </SectionHeader>
          )}
          <SectionHeader>
            {truncated
              ? `Showing ${files.length} of ${totalFiles} files`
              : `Found ${totalFiles} files`}
          </SectionHeader>
          {files.length > 0 ? (
            <div className="space-y-1">
              {files.map((file, index) => (
                <MonoText className="text-xs" key={index}>
                  {file}
                </MonoText>
              ))}
              {truncated && (
                <div className="pt-1 text-xs text-muted-foreground">
                  Results truncated. Use a more specific path or pattern.
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">No files found</div>
          )}
        </div>
      );
    }
    case "tool-grep": {
      const matches = part.output.matches;
      return (
        <div>
          <SectionHeader>
            Pattern:{" "}
            <MonoText className="inline">{part.input.pattern}</MonoText>
          </SectionHeader>
          {part.input.path && (
            <SectionHeader>
              Path: <MonoText className="inline">{part.input.path}</MonoText>
            </SectionHeader>
          )}
          {part.input.include && (
            <SectionHeader>
              Include:{" "}
              <MonoText className="inline">{part.input.include}</MonoText>
            </SectionHeader>
          )}
          <SectionHeader>
            Found {part.output.totalMatches} matches
            {part.output.truncated && " (truncated)"}:
          </SectionHeader>
          {matches.length > 0 ? (
            <div className="space-y-2">
              {matches.slice(0, 10).map((match, index) => (
                <div className="border-l-2 border-accent/30 pl-2" key={index}>
                  <MonoText className="text-xs text-muted-foreground">
                    {match.path}:{match.lineNum}
                  </MonoText>
                  <MonoText className="text-xs">{match.lineText}</MonoText>
                </div>
              ))}
              {matches.length > 10 && (
                <div className="text-xs text-muted-foreground">
                  ... and {matches.length - 10} more matches
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">No matches found</div>
          )}
        </div>
      );
    }
    case "tool-read_file": {
      return <ToolPartReadFile input={part.input} output={part.output} />;
    }
    case "tool-run_diagnostics": {
      const errors = part.output.errors;
      return (
        <div>
          <SectionHeader>
            Diagnostics Results:{" "}
            {errors.length > 0
              ? `${errors.length} error${errors.length === 1 ? "" : "s"} found`
              : "No errors found"}
          </SectionHeader>
          {errors.length > 0 ? (
            <div className="space-y-1">
              {errors.map((error, index) => (
                <div
                  className="border-l-2 border-red-300 pl-2 font-mono text-xs dark:border-red-600"
                  key={index}
                >
                  {error}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No diagnostic errors found in the project.
            </div>
          )}
        </div>
      );
    }
    case "tool-run_shell_command": {
      return (
        <div>
          <SectionHeader>Command executed</SectionHeader>
          <MonoText className="mb-2 text-xs">$ {part.output.command}</MonoText>
          <div className="mb-2 flex items-center gap-2">
            <Badge
              variant={part.output.exitCode === 0 ? "secondary" : "destructive"}
            >
              Exit code: {part.output.exitCode}
            </Badge>
            {part.input.timeoutMs && (
              <Badge variant="outline">Timeout: {part.input.timeoutMs}ms</Badge>
            )}
          </div>
          {part.output.stdout && (
            <>
              <SectionHeader>Output</SectionHeader>
              <ScrollableCodeBlock>{part.output.stdout}</ScrollableCodeBlock>
            </>
          )}
          {part.output.stderr && (
            <>
              <div className="mb-1 text-red-600 dark:text-red-400">Error</div>
              <CodeBlock className="max-h-32 overflow-y-auto rounded-sm border bg-red-50 p-2 text-xs whitespace-pre-wrap text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {part.output.stderr}
              </CodeBlock>
            </>
          )}
        </div>
      );
    }
    case "tool-task": {
      return (
        <ToolPartTask project={project} sessionId={part.output.sessionId} />
      );
    }
    case "tool-think": {
      return (
        <div>
          <SectionHeader>Thought</SectionHeader>
          <div className="text-sm italic">{part.output.thought}</div>
        </div>
      );
    }
    case "tool-unavailable": {
      return (
        <div>
          <SectionHeader>Unknown tool</SectionHeader>
        </div>
      );
    }
    case "tool-web_search": {
      if (part.output.state === "failure") {
        return (
          <ToolCapabilityFailure
            capabilityLabel="web search"
            errorMessage={part.output.errorMessage}
            onRetry={onRetry}
            providerGuardDescription="Sign up for Quests or add an AI provider that supports web search."
            responseBody={part.output.responseBody}
            retryMessage={`I added a web search provider. Retry searching for "${part.input.query}"`}
          />
        );
      }
      return (
        <div>
          <div className="mb-3 flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Model:</span>
            <AIProviderIcon
              className="size-3.5"
              displayName={part.output.provider.displayName}
              showTooltip
              type={part.output.provider.type}
            />
            <MonoText className="text-xs">{part.output.modelId}</MonoText>
          </div>
          <SectionHeader>
            Query: <MonoText className="inline">{part.input.query}</MonoText>
          </SectionHeader>
          <SectionHeader>Result</SectionHeader>
          <SessionMarkdown className="w-full" markdown={part.output.text} />
          {part.output.sources.length > 0 && (
            <div className="mt-3">
              <SectionHeader>
                {part.output.sources.length} source
                {part.output.sources.length === 1 ? "" : "s"}
              </SectionHeader>
              <div className="mt-1 space-y-2">
                {part.output.sources.map((source, index) => (
                  <div className="flex items-center gap-2 text-sm" key={index}>
                    <Favicon url={source.url} />
                    <ExternalLink
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      href={source.url}
                    >
                      {source.title || source.url}
                    </ExternalLink>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    case "tool-write_file": {
      return (
        <div>
          <ToolPartFilePath
            filePath={part.output.filePath}
            label={part.output.isNewFile ? "New file written" : "File written"}
          />
          <div className="mt-2">
            <SectionHeader>Content preview</SectionHeader>
            <ScrollableCodeBlock>
              {part.output.content.length > 500
                ? part.output.content.slice(0, 500) + "\n... (truncated)"
                : part.output.content}
            </ScrollableCodeBlock>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {part.output.content.split("\n").length} lines,{" "}
            {part.output.content.length} characters
          </div>
        </div>
      );
    }
    default: {
      part satisfies never;
      return (
        <div>
          <SectionHeader>Tool completed</SectionHeader>
          <CodeBlock>{JSON.stringify(part, null, 2)}</CodeBlock>
        </div>
      );
    }
  }
}
