import { type SessionMessagePart } from "@quests/workspace/client";

import { Badge } from "../ui/badge";
import { CodeBlock } from "./code-block";
import { ToolPartFilePath } from "./file-path";
import { MonoText } from "./mono-text";
import { ToolPartReadFile } from "./read-file";
import { ScrollableCodeBlock } from "./scrollable-code-block";
import { SectionHeader } from "./section-header";

export function ToolContent({
  part,
}: {
  part: Extract<SessionMessagePart.ToolPart, { state: "output-available" }>;
}) {
  switch (part.type) {
    case "tool-choose": {
      return (
        <div>
          <SectionHeader>Question:</SectionHeader>
          <div className="mb-2 text-sm">{part.input.question}</div>
          <SectionHeader>Choices:</SectionHeader>
          <div className="mb-2 space-y-1">
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
          <ToolPartFilePath
            filePath={part.output.filePath}
            label="File edited:"
          />
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
                <div className="mb-1 flex items-center gap-2">
                  <Badge
                    variant={
                      result.exitCode === 0 ? "secondary" : "destructive"
                    }
                  >
                    Exit code: {result.exitCode}
                  </Badge>
                </div>
                {result.stdout && (
                  <CodeBlock className="text-xs whitespace-pre-wrap text-green-600 dark:text-green-400">
                    {result.stdout}
                  </CodeBlock>
                )}
                {result.stderr && (
                  <CodeBlock className="text-xs whitespace-pre-wrap text-red-600 dark:text-red-400">
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
              <SectionHeader>Output:</SectionHeader>
              <ScrollableCodeBlock>{part.output.stdout}</ScrollableCodeBlock>
            </>
          )}
          {part.output.stderr && (
            <>
              <div className="mb-1 text-red-600 dark:text-red-400">Error:</div>
              <CodeBlock className="max-h-32 overflow-y-auto rounded border bg-red-50 p-2 text-xs whitespace-pre-wrap text-red-600 dark:bg-red-900/20 dark:text-red-400">
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
          <div className="mb-2 flex items-center gap-2">
            <ToolPartFilePath
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
          <div className="mt-1 text-xs text-muted-foreground">
            {part.output.content.split("\n").length} lines,{" "}
            {part.output.content.length} characters
          </div>
        </div>
      );
    }
    default: {
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
