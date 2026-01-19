import type { SessionMessagePart } from "@quests/workspace/client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronUp } from "lucide-react";
import { throttle } from "radashi";
import { useEffect, useRef, useState } from "react";

import { useTheme } from "../../components/theme-provider";
import {
  getLanguageFromFilePath,
  toSupportedLanguage,
} from "../../lib/file-extension-to-language";
import { rpcClient } from "../../rpc/client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";

export function StreamingContent({
  isLoading,
  part,
}: {
  isLoading: boolean;
  part: SessionMessagePart.ToolPart;
}) {
  if (!part.input) {
    return null;
  }

  let content: string | undefined;
  let filePath: string | undefined;
  let language: string | undefined;

  const hasOutput =
    part.state === "output-available" && part.output !== undefined;

  switch (part.type) {
    case "tool-edit_file": {
      if (hasOutput && "diff" in part.output && part.output.diff) {
        // Trim first 5 lines, which are filename, ===, ---, and +++, And @@
        content = part.output.diff.split("\n").slice(5).join("\n");
        language = "diff";
      } else {
        content = part.input.newString;
        filePath = part.input.filePath;
      }
      break;
    }
    case "tool-run_shell_command": {
      const command = part.input.command || "";
      const parts: string[] = [`$ ${command}`];

      if (hasOutput && "stdout" in part.output && "stderr" in part.output) {
        if (part.output.stdout) {
          parts.push(part.output.stdout);
        }
        if (part.output.stderr) {
          parts.push(part.output.stderr);
        }
      }

      content = parts.join("\n");
      // No language set - use plain text for shell output
      break;
    }
    case "tool-write_file": {
      content = part.input.content;
      filePath = part.input.filePath;
      break;
    }
    default: {
      return null;
    }
  }

  if (!content) {
    return null;
  }

  return (
    <StreamingToolContent
      content={content}
      filePath={filePath}
      isLoading={isLoading}
      language={language}
    />
  );
}

function StreamingToolContent({
  content,
  filePath,
  isLoading,
  language: explicitLanguage,
}: {
  content: string;
  filePath?: string;
  isLoading: boolean;
  language?: string;
}) {
  "use no memo";
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [highlightedLines, setHighlightedLines] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const { resolvedTheme } = useTheme();

  const language =
    explicitLanguage ||
    (filePath ? getLanguageFromFilePath(filePath) : undefined);

  // Remove trailing empty line when done loading
  const cleanedContent =
    !isLoading && content.endsWith("\n") ? content.slice(0, -1) : content;
  const lines = cleanedContent.split("\n");

  useEffect(() => {
    if (!language) {
      return;
    }

    const updateHighlighting = throttle(
      { interval: 500, trailing: true },
      async (code: string) => {
        try {
          const supportedLanguages =
            await rpcClient.syntax.supportedLanguages.call();
          const validLanguage = toSupportedLanguage(
            language,
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
  }, [cleanedContent, language, resolvedTheme]);

  const displayLines = highlightedLines.length > 0 ? highlightedLines : lines;

  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: displayLines.length,
    estimateSize: () => 16,
    getScrollElement: () => scrollContainerRef.current,
    overscan: isExpanded ? 5 : 1,
  });

  const scrollOffset = virtualizer.scrollOffset ?? 0;
  const viewportHeight = virtualizer.scrollRect?.height ?? 0;
  const totalSize = virtualizer.getTotalSize();

  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset + viewportHeight < totalSize - 1;

  // Stick to bottom when loading
  useEffect(() => {
    if (!isLoading || !scrollContainerRef.current) {
      return;
    }

    const lastItem = virtualizer.getVirtualItems().at(-1);

    if (lastItem) {
      virtualizer.scrollToIndex(displayLines.length - 1, {
        align: "end",
        behavior: "auto",
      });
    }
  }, [displayLines.length, isLoading, virtualizer]);

  // Scroll to top when loading stops
  useEffect(() => {
    if (isLoading || !scrollContainerRef.current) {
      return;
    }

    virtualizer.scrollToIndex(0, {
      align: "start",
      behavior: "auto",
    });
  }, [isLoading, virtualizer]);

  if (!cleanedContent) {
    return null;
  }

  const virtualItems = virtualizer.getVirtualItems();

  const contentInner = (
    <div
      className="font-mono text-xs whitespace-pre"
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        position: "relative",
        width: "100%",
      }}
    >
      {virtualItems.map((virtualItem) => {
        const line = displayLines[virtualItem.index];
        const isHighlighted = highlightedLines.length > 0;

        return (
          <div
            key={virtualItem.key}
            style={{
              height: `${virtualItem.size}px`,
              left: 0,
              position: "absolute",
              top: 0,
              transform: `translateY(${virtualItem.start}px)`,
              width: "100%",
            }}
          >
            {isHighlighted ? (
              <div dangerouslySetInnerHTML={{ __html: line || "" }} />
            ) : (
              <pre className="font-mono text-xs">{line}</pre>
            )}
          </div>
        );
      })}
    </div>
  );

  // When loading, return content directly (auto-scroll enabled, scrolling disabled)
  if (isLoading) {
    return (
      <div className="relative bg-muted py-2 pl-4">
        <div
          className="pointer-events-none max-h-44 overflow-hidden"
          ref={scrollContainerRef}
        >
          {contentInner}
        </div>

        {canScrollUp && (
          <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 h-4 bg-linear-to-b from-background to-transparent" />
        )}

        {canScrollDown && (
          <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-4 bg-linear-to-t from-background to-transparent" />
        )}
      </div>
    );
  }

  // When done loading, wrap in collapsible similar to user-message
  // Only show collapsible if content exceeds collapsed height (max-h-20 = 80px)
  const collapsedMaxHeight = 4 * 20; // max-h-20 = 4rem = 80px
  const needsCollapsible = totalSize > collapsedMaxHeight;

  if (!needsCollapsible) {
    // Content fits in collapsed view, show directly without collapsible
    return (
      <div className="bg-muted">
        <div className="relative py-2 pl-4">
          <div
            ref={scrollContainerRef}
            style={{
              overflowY: "hidden",
            }}
          >
            {contentInner}
          </div>
        </div>
      </div>
    );
  }

  const triggerButtonClassName =
    "group flex cursor-pointer items-center justify-center bg-muted py-0.5 text-xs text-muted-foreground transition-colors";

  return (
    <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
      {isExpanded ? (
        <div className="bg-muted">
          <div className="relative py-2 pl-4">
            <div className="max-h-92 overflow-auto" ref={scrollContainerRef}>
              {contentInner}
            </div>
          </div>
        </div>
      ) : (
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer bg-muted">
            <div className="relative py-2 pl-4">
              <div
                className="max-h-20 overflow-hidden"
                ref={scrollContainerRef}
              >
                {contentInner}
              </div>

              <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-8 rounded-b-xl bg-linear-to-t from-muted to-transparent" />
            </div>

            <div className={triggerButtonClassName}>
              <ChevronDown className="size-3 transition-colors group-hover:text-foreground" />
            </div>
          </div>
        </CollapsibleTrigger>
      )}

      <CollapsibleContent>
        <div
          className={triggerButtonClassName}
          onClick={() => {
            setIsExpanded(false);
          }}
          title="Click to collapse"
        >
          <ChevronUp className="size-3 transition-colors group-hover:text-foreground" />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
