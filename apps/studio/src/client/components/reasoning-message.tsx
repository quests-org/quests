import { formatDurationFromDates } from "@/client/lib/format-time";
import { cn } from "@/client/lib/utils";
import { Brain } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";

import { CollapsiblePartTrigger } from "./collapsible-part";
import { SessionMarkdown } from "./session-markdown";
import { ToolPartListItemCompact } from "./tool-part/list-item-compact";
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
    container.addEventListener("scroll", updateScrollState, { passive: true });

    // Also check on content changes
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [isExpanded, isLoading, text]);

  const displayText = text.replaceAll("[REDACTED]", "");

  const headerContent = (
    <ToolPartListItemCompact
      icon={hideIcon ? undefined : <Brain className="size-3" />}
      isExpanded={!isLoading && isExpanded}
      label={
        isLoading ? (
          "Planning..."
        ) : duration ? (
          <>
            Thought <span className="text-foreground/60">for {duration}</span>
          </>
        ) : (
          "Thought"
        )
      }
      labelClassName={cn(isLoading && "shiny-text")}
    />
  );

  return (
    <Collapsible
      className="w-full"
      onOpenChange={setIsExpanded}
      open={isExpanded || isLoading}
    >
      <CollapsibleTrigger asChild disabled={!displayText.trim()}>
        <CollapsiblePartTrigger>{headerContent}</CollapsiblePartTrigger>
      </CollapsibleTrigger>

      {!(isLoading && !displayText.trim()) && (
        <CollapsibleContent>
          <div className="relative mt-2 text-xs">
            <div
              className="max-h-44 overflow-y-auto rounded-none border-0 border-l-4 border-muted-foreground/30 bg-muted/30 py-2 pl-4"
              ref={(el) => {
                scrollContainerRef.current = el;
                if (isLoading) {
                  scrollRef.current = el;
                }
              }}
            >
              <SessionMarkdown
                className={cn("italic", !isLoading && "opacity-60")}
                markdown={
                  isLoading
                    ? displayText
                    : displayText.trim()
                      ? displayText
                      : "Reasoning not available"
                }
                ref={contentRef}
              />
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
