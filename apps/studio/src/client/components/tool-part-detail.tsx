import { type SessionMessagePart } from "@quests/workspace/client";

import { cleanFilePath } from "../lib/file-utils";
import { Badge } from "./ui/badge";

export function ToolDetailedOutput({
  part,
}: {
  part: Extract<SessionMessagePart.ToolPart, { state: "output-available" }>;
}) {
  const explanationObject =
    typeof part.input === "object"
      ? (part.input as { explanation?: string })
      : undefined;
  const explanation = explanationObject?.explanation;

  return (
    <div>
      {explanation && (
        <div className="mb-3 pb-2 border-b border-muted-foreground/20">
          <SectionHeader>Explanation:</SectionHeader>
          <div className="text-sm italic text-muted-foreground">
            {explanation}
          </div>
        </div>
      )}
      <ToolContent part={part} />
    </div>
  );
}

function CodeBlock({
  children,
  className = "text-xs whitespace-pre-wrap",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <pre className={`font-mono ${className}`}>{children}</pre>;
}

function FileDisplay({ filePath, label }: { filePath: string; label: string }) {
  return (
    <div>
      <SectionHeader>{label}</SectionHeader>
      <MonoText>{cleanFilePath(filePath)}</MonoText>
    </div>
  );
}

function MonoText({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`font-mono ${className}`}>{children}</div>;
}

function ScrollableCodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <CodeBlock className="text-xs whitespace-pre-wrap max-h-32 overflow-y-auto bg-background/50 p-2 rounded border">
      {children}
    </CodeBlock>
  );
}

// Shared components to reduce repetition
function SectionHeader({ children }: { children: React.ReactNode }) {
  return <div className="text-muted-foreground mb-1">{children}</div>;
}

function ToolContent({
  part,
}: {
  part: Extract<SessionMessagePart.ToolPart, { state: "output-available" }>;
}) {
  switch (part.type) {
    case "tool-choose": {
      return (
        <div>
          <SectionHeader>Question:</SectionHeader>
          <div className="text-sm mb-2">{part.input.question}</div>
          <SectionHeader>Choices:</SectionHeader>
          <div className="space-y-1 mb-2">
            {part.input.choices.map((choice, index) => (
              <MonoText className="text-xs" key={index}>
                {choice}
              </MonoText>
            ))}
          </div>
          <SectionHeader>Selected choice:</SectionHeader>
          <MonoText className="font-semibold">
            {part.output.selectedChoice}
          </MonoText>
        </div>
      );
    }
    case "tool-edit_file": {
      return (
        <div>
          <FileDisplay filePath={part.output.filePath} label="File edited:" />
          {part.input.oldString && (
            <div className="mt-2">
              <SectionHeader>Search pattern:</SectionHeader>
              <ScrollableCodeBlock>{part.input.oldString}</ScrollableCodeBlock>
            </div>
          )}
          {part.input.newString && (
            <div className="mt-2">
              <SectionHeader>Replacement:</SectionHeader>
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
    case "tool-file_tree": {
      return (
        <div>
          <SectionHeader>Directory structure:</SectionHeader>
          <CodeBlock>{part.output.tree}</CodeBlock>
        </div>
      );
    }
    case "tool-glob": {
      const files = part.output.files;
      return (
        <div>
          <SectionHeader>
            Pattern:{" "}
            <MonoText className="inline">{part.input.pattern}</MonoText>
          </SectionHeader>
          <SectionHeader>Found {files.length} files:</SectionHeader>
          {files.length > 0 ? (
            <div className="space-y-1">
              {files.map((file, index) => (
                <MonoText className="text-xs" key={index}>
                  {file}
                </MonoText>
              ))}
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
                <div className="text-muted-foreground text-xs">
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
      return part.output.state === "exists" ? (
        <div>
          <SectionHeader>
            File: {cleanFilePath(part.output.filePath)}
          </SectionHeader>
          {part.input.offset !== undefined && part.input.offset > 0 && (
            <div className="text-muted-foreground text-xs mb-1">
              Starting from line {part.input.offset + 1}
            </div>
          )}
          {part.input.limit !== undefined && (
            <div className="text-muted-foreground text-xs mb-1">
              Reading {part.input.limit} lines
            </div>
          )}
          {part.output.content && (
            <ScrollableCodeBlock>{part.output.content}</ScrollableCodeBlock>
          )}
          <div className="text-muted-foreground text-xs mt-1">
            Showing {part.output.displayedLines} lines
            {part.output.hasMoreLines && " (truncated)"}
            {part.output.offset > 0 && ` (offset: ${part.output.offset})`}
          </div>
        </div>
      ) : (
        <div>
          <FileDisplay
            filePath={part.output.filePath}
            label="File not found:"
          />
          {part.output.suggestions.length > 0 && (
            <div className="mt-2">
              <SectionHeader>Suggestions:</SectionHeader>
              <div className="space-y-1">
                {part.output.suggestions.map((suggestion, index) => (
                  <MonoText
                    className="text-xs text-muted-foreground"
                    key={index}
                  >
                    {suggestion}
                  </MonoText>
                ))}
              </div>
            </div>
          )}
        </div>
      );
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
                  className="border-l-2 border-red-300 dark:border-red-600 pl-2 text-xs font-mono"
                  key={index}
                >
                  {error}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">
              No diagnostic errors found in the project.
            </div>
          )}
        </div>
      );
    }
    case "tool-run_git_commands": {
      const results = part.output.results;
      return (
        <div>
          <SectionHeader>Git commands executed:</SectionHeader>
          <div className="space-y-2">
            {results.map((result, index) => (
              <div className="border-l-2 border-accent/30 pl-2" key={index}>
                <MonoText className="text-xs text-muted-foreground">
                  $ git {result.command}
                </MonoText>
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant={
                      result.exitCode === 0 ? "secondary" : "destructive"
                    }
                  >
                    Exit code: {result.exitCode}
                  </Badge>
                </div>
                {result.stdout && (
                  <CodeBlock className="text-xs text-green-600 dark:text-green-400 whitespace-pre-wrap">
                    {result.stdout}
                  </CodeBlock>
                )}
                {result.stderr && (
                  <CodeBlock className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
                    {result.stderr}
                  </CodeBlock>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "tool-run_shell_command": {
      return (
        <div>
          <SectionHeader>Command executed:</SectionHeader>
          <MonoText className="text-xs mb-2">$ {part.output.command}</MonoText>
          <div className="flex items-center gap-2 mb-2">
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
              <SectionHeader>Output:</SectionHeader>
              <ScrollableCodeBlock>{part.output.stdout}</ScrollableCodeBlock>
            </>
          )}
          {part.output.stderr && (
            <>
              <div className="mb-1 text-red-600 dark:text-red-400">Error:</div>
              <CodeBlock className="text-xs whitespace-pre-wrap bg-red-50 dark:bg-red-900/20 p-2 rounded border max-h-32 overflow-y-auto text-red-600 dark:text-red-400">
                {part.output.stderr}
              </CodeBlock>
            </>
          )}
        </div>
      );
    }
    case "tool-think": {
      return (
        <div>
          <SectionHeader>Thought:</SectionHeader>
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
    case "tool-write_file": {
      return (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileDisplay
              filePath={part.output.filePath}
              label="File written:"
            />
            {part.output.isNewFile && (
              <Badge variant="secondary">New file</Badge>
            )}
          </div>
          <SectionHeader>Content preview:</SectionHeader>
          <ScrollableCodeBlock>
            {part.output.content.length > 500
              ? part.output.content.slice(0, 500) + "\n... (truncated)"
              : part.output.content}
          </ScrollableCodeBlock>
          <div className="text-muted-foreground text-xs mt-1">
            {part.output.content.split("\n").length} lines,{" "}
            {part.output.content.length} characters
          </div>
        </div>
      );
    }
    default: {
      // TypeScript exhaustiveness check - this should never be reached
      const _exhaustiveCheck: never = part;
      return (
        <div>
          <SectionHeader>Tool completed</SectionHeader>
          <CodeBlock>{JSON.stringify(_exhaustiveCheck, null, 2)}</CodeBlock>
        </div>
      );
    }
  }
}
