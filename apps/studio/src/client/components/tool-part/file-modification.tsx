import type { SessionMessagePart } from "@quests/workspace/client";

import { Loader2Icon } from "lucide-react";
import { throttle } from "radashi";
import { useEffect, useState } from "react";

import {
  getLanguageFromFilePath,
  toSupportedLanguage,
} from "../../lib/file-extension-to-language";
import { filenameFromFilePath } from "../../lib/file-utils";
import { getToolLabel, getToolStreamingLabel } from "../../lib/tool-display";
import { cn } from "../../lib/utils";
import { rpcClient } from "../../rpc/client";
import { FileIcon } from "../file-icon";
import { useTheme } from "../theme-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ToolPartListItemCompact } from "./list-item-compact";
import { ToolCard, ToolCardHeader } from "./tool-card";
import { VirtualizedScrollingText } from "./virtualized-scrolling-text";

type FileModificationPart = Extract<
  SessionMessagePart.ToolPart,
  { type: "tool-edit_file" | "tool-write_file" }
>;

export function FileModification({
  isLoading,
  part,
}: {
  isLoading: boolean;
  part: FileModificationPart;
}) {
  const [highlightedLines, setHighlightedLines] = useState<string[]>([]);
  const { resolvedTheme } = useTheme();
  const toolName = part.type === "tool-edit_file" ? "edit_file" : "write_file";

  let content: string | undefined;
  const filePath = part.input?.filePath;
  let language: string | undefined;

  const isDone = part.state === "output-available";

  if (part.input) {
    if (part.type === "tool-edit_file") {
      if (isDone && part.output.diff) {
        // Trim first 5 lines, which are filename, ===, ---, and +++, And @@
        content = part.output.diff.split("\n").slice(5).join("\n");
        language = "diff";
      } else {
        content = part.input.newString;
      }
    } else {
      content = part.input.content;
    }
  }

  const filename = filePath ? filenameFromFilePath(filePath) : undefined;

  const detectedLanguage =
    language || (filePath ? getLanguageFromFilePath(filePath) : undefined);

  // Remove trailing empty line when done loading
  const cleanedContent = content
    ? !isLoading && content.endsWith("\n")
      ? content.slice(0, -1)
      : content
    : "";

  useEffect(() => {
    if (!detectedLanguage || !content) {
      return;
    }

    const updateHighlighting = throttle(
      { interval: 500, trailing: true },
      async (code: string) => {
        try {
          const supportedLanguages =
            await rpcClient.syntax.supportedLanguages.call();
          const validLanguage = toSupportedLanguage(
            detectedLanguage,
            supportedLanguages,
          );

          if (!validLanguage) {
            return;
          }

          const htmlLines = await rpcClient.syntax.highlightCode.call({
            code,
            lang: validLanguage,
            theme: resolvedTheme === "dark" ? "dark" : "light",
          });

          setHighlightedLines(htmlLines);
        } catch {
          // Silently fail - just keep showing raw text
        }
      },
    );

    updateHighlighting(cleanedContent);
  }, [cleanedContent, detectedLanguage, resolvedTheme, content]);

  const reasoning = part.input?.explanation;

  if (!isDone) {
    return (
      <div className="w-full">
        <div className="flex h-6 items-center px-1">
          <ToolPartListItemCompact
            icon={<Loader2Icon className="size-3 animate-spin" />}
            label={getToolStreamingLabel(toolName, !!filename)}
            labelClassName="shiny-text"
            reasoning={reasoning}
            value={filename}
          />
        </div>
      </div>
    );
  }

  let additions = 0;
  let deletions = 0;
  if (
    part.type === "tool-edit_file" &&
    "diff" in part.output &&
    part.output.diff
  ) {
    const diffLines = part.output.diff.split("\n");
    for (const line of diffLines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions++;
      }
    }
  }

  return (
    <ToolCard>
      <ToolCardHeader>
        {isLoading ? (
          <Loader2Icon className="size-3 shrink-0 animate-spin text-accent-foreground/80" />
        ) : (
          <FileIcon className="size-3 shrink-0" filename={filename || "file"} />
        )}
        <span
          className={cn(
            "shrink-0 font-medium text-foreground/80",
            isLoading && "shiny-text",
          )}
        >
          {isLoading
            ? getToolStreamingLabel(toolName, true)
            : getToolLabel(toolName)}
        </span>
        {filename && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0 truncate text-foreground/60">
                {filename}
              </span>
            </TooltipTrigger>
            <TooltipContent>{filePath}</TooltipContent>
          </Tooltip>
        )}
        {additions > 0 || deletions > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="shrink-0 text-muted-foreground">
                +{additions} -{deletions}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {additions} line{additions === 1 ? "" : "s"} added, {deletions}{" "}
              line{deletions === 1 ? "" : "s"} removed
            </TooltipContent>
          </Tooltip>
        ) : null}
        {reasoning && (
          <span className="ml-auto min-w-0 truncate text-muted-foreground/60">
            {reasoning}
          </span>
        )}
      </ToolCardHeader>

      <VirtualizedScrollingText
        autoScrollToBottom={isLoading}
        content={cleanedContent}
        highlightedLines={
          highlightedLines.length > 0 ? highlightedLines : undefined
        }
      />
    </ToolCard>
  );
}
