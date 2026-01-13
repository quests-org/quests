import type { SessionMessagePart } from "@quests/workspace/client";

import { motion } from "framer-motion";
import { memo, useEffect, useRef, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";

import { useSyntaxHighlighting } from "../../hooks/use-syntax-highlighting";
import { getLanguageFromFilePath } from "../../lib/file-extension-to-language";

const StreamingToolContent = memo(function StreamingToolContent({
  content,
  filePath,
  isLoading,
}: {
  content: string;
  filePath?: string;
  isLoading: boolean;
}) {
  const [scrollState, setScrollState] = useState({
    canScrollDown: false,
    canScrollUp: false,
  });
  const [debouncedContent, setDebouncedContent] = useState(content);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { contentRef, scrollRef } = useStickToBottom({
    damping: 0.9,
    mass: 2.5,
    stiffness: 0.01,
  });

  useEffect(() => {
    const delay = isLoading ? 500 : 0;

    const timer = setTimeout(() => {
      setDebouncedContent(content);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [content, isLoading]);

  const language = filePath ? getLanguageFromFilePath(filePath) : undefined;
  const { highlightedHtml } = useSyntaxHighlighting({
    code: debouncedContent,
    language,
  });

  const updateScrollState = () => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const { clientHeight, scrollHeight, scrollTop } = container;
    setScrollState({
      canScrollDown: scrollTop < scrollHeight - clientHeight - 1,
      canScrollUp: scrollTop > 0,
    });
  };

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    updateScrollState();
    container.addEventListener("scroll", updateScrollState);

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [isLoading, content]);

  if (!content) {
    return null;
  }

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="relative mt-2 text-xs"
      initial={{ opacity: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div
        className="max-h-44 overflow-y-auto rounded-r-md border-l-4 border-muted-foreground/30 bg-muted/30 py-2 pl-4"
        ref={(el) => {
          scrollContainerRef.current = el;
          if (isLoading) {
            scrollRef.current = el;
          }
        }}
      >
        <div ref={contentRef}>
          {highlightedHtml ? (
            <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
          ) : (
            <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap">
              {content}
            </pre>
          )}
        </div>
      </div>

      {scrollState.canScrollUp && (
        <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 h-4 bg-linear-to-b from-background to-transparent" />
      )}

      {scrollState.canScrollDown && (
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-4 bg-linear-to-t from-background to-transparent" />
      )}
    </motion.div>
  );
});

export function StreamingContent({
  part,
}: {
  part: SessionMessagePart.ToolPart;
}) {
  if (part.state !== "input-streaming" && part.state !== "input-available") {
    return null;
  }

  if (!part.input) {
    return null;
  }

  let content: string | undefined;
  let filePath: string | undefined;

  switch (part.type) {
    case "tool-edit_file": {
      content = part.input.newString;
      filePath = part.input.filePath;
      break;
    }
    case "tool-run_shell_command": {
      content = part.input.command;
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
      isLoading={part.state === "input-streaming"}
    />
  );
}
