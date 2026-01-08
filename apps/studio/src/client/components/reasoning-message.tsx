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
  hideIcon?: boolean;
  isLoading?: boolean;
  text: string;
}

export const ReasoningMessage = memo(function ReasoningMessage({
  createdAt,
  endedAt,
  hideIcon = false,
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
    <div className="flex w-full min-w-0 items-center gap-2 text-xs leading-tight">
      {!hideIcon && (
        <span className="shrink-0 text-accent-foreground/80">
          <Brain className="size-3" />
        </span>
      )}
      <span
        className={cn(
          "shrink-0 font-medium text-foreground/60",
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
        <span className="ml-auto shrink-0 text-accent-foreground/60">
          <ChevronDown className="size-3" />
        </span>
      )}
    </div>
  );

  const isRedacted = text.trim() === "[REDACTED]";

  return (
    <Collapsible
      className="w-full"
      onOpenChange={setIsExpanded}
      open={isExpanded || isLoading}
    >
      <CollapsibleTrigger asChild disabled={isRedacted}>
        <CollapsiblePartTrigger>{headerContent}</CollapsiblePartTrigger>
      </CollapsibleTrigger>

      {!(isLoading && !text.trim()) && !isRedacted && (
        <CollapsibleContent>
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
              <div
                className={cn(
                  "prose prose-sm max-w-none text-sm leading-relaxed wrap-break-word italic dark:prose-invert",
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
              <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 h-4 bg-linear-to-b from-background to-transparent" />
            )}

            {scrollState.canScrollDown && (
              <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-4 bg-linear-to-t from-background to-transparent" />
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
});
