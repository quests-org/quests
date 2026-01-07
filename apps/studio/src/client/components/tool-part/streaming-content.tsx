import type { SessionMessagePart } from "@quests/workspace/client";

import { memo, useEffect, useRef, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";

const StreamingToolContent = memo(function StreamingToolContent({
  content,
  isLoading,
}: {
  content: string;
  isLoading: boolean;
}) {
  const [scrollState, setScrollState] = useState({
    canScrollDown: false,
    canScrollUp: false,
  });
  const [shouldShow, setShouldShow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { contentRef, scrollRef } = useStickToBottom({
    damping: 0.9,
    mass: 2.5,
    stiffness: 0.01,
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
    const timer = setTimeout(() => {
      setShouldShow(true);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

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

  if (!content || !shouldShow) {
    return null;
  }

  return (
    <div className="relative mt-2 text-xs">
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
          <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap">
            {content}
          </pre>
        </div>
      </div>

      {scrollState.canScrollUp && (
        <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 h-4 bg-linear-to-b from-background to-transparent" />
      )}

      {scrollState.canScrollDown && (
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-4 bg-linear-to-t from-background to-transparent" />
      )}
    </div>
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

  switch (part.type) {
    case "tool-edit_file": {
      content = part.input.newString;
      break;
    }
    case "tool-run_shell_command": {
      content = part.input.command;
      break;
    }
    case "tool-write_file": {
      content = part.input.content;
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
      isLoading={part.state === "input-streaming"}
    />
  );
}
