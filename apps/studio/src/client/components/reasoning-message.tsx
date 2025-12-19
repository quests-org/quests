import { formatDurationFromDates } from "@/client/lib/format-time";
import { cn } from "@/client/lib/utils";
import { Brain, ChevronDown } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";

import { CollapsiblePartTrigger } from "./collapsible-part-trigger";
import { Markdown } from "./markdown";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

interface ReasoningMessageProps {
  createdAt?: Date;
  endedAt?: Date;
  isLoading?: boolean;
  text: string;
}

export const ReasoningMessage = memo(function ReasoningMessage({
  createdAt,
  endedAt,
  isLoading = false,
  text,
}: ReasoningMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [scrollState, setScrollState] = useState({
    canScrollDown: false,
    canScrollUp: false,
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const duration = formatDurationFromDates(createdAt, endedAt);

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
      canScrollDown: scrollTop < scrollHeight - clientHeight - 1, // -1 for rounding
      canScrollUp: scrollTop > 0,
    });
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    updateScrollState();
    container.addEventListener("scroll", updateScrollState);

    // Also check on content changes
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [isExpanded, isLoading, text]);

  const headerContent = (
    <div className="flex items-center gap-2 min-w-0 w-full text-xs leading-tight">
      <span className="shrink-0 text-accent-foreground/80">
        <Brain className="size-3" />
      </span>
      <span
        className={cn(
          "text-foreground/60 font-medium shrink-0",
          isLoading && "shiny-text",
        )}
      >
        {isLoading
          ? "Planning..."
          : duration
            ? `Thought for ${duration}`
            : "Planning interrupted"}
      </span>
      {!isLoading && isExpanded && (
        <span className="shrink-0 text-accent-foreground/60 ml-auto">
          <ChevronDown className="size-3" />
        </span>
      )}
    </div>
  );

  return (
    <Collapsible
      className="w-full"
      onOpenChange={setIsExpanded}
      open={isExpanded || isLoading}
    >
      <CollapsibleTrigger asChild>
        <CollapsiblePartTrigger>{headerContent}</CollapsiblePartTrigger>
      </CollapsibleTrigger>

      {!(isLoading && !text.trim()) && (
        <CollapsibleContent>
          <div className="mt-2 text-xs relative">
            <div
              className="max-h-44 overflow-y-auto border-l-4 border-muted-foreground/30 pl-4 bg-muted/30 py-2 rounded-r-md"
              ref={(el) => {
                scrollContainerRef.current = el;
                if (isLoading) {
                  scrollRef.current = el;
                }
              }}
            >
              <div
                className={cn(
                  "text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert wrap-break-word italic",
                  !isLoading && "opacity-60",
                )}
                ref={contentRef}
              >
                <Markdown
                  markdown={
                    isLoading
                      ? text
                      : text.trim()
                        ? text
                        : "Reasoning not available"
                  }
                />
              </div>
            </div>

            {scrollState.canScrollUp && (
              <div className="absolute top-0 left-0 right-0 h-4 bg-linear-to-b from-background to-transparent pointer-events-none z-10" />
            )}

            {scrollState.canScrollDown && (
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-linear-to-t from-background to-transparent pointer-events-none z-10" />
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
});
