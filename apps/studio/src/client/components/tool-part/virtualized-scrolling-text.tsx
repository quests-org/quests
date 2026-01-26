import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { tv } from "tailwind-variants";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";

const viewportStyles = tv({
  slots: {
    container: "relative py-2 pl-2",
    fadeBottom:
      "pointer-events-none absolute right-0 bottom-0 left-0 z-10 h-4 bg-linear-to-t from-background to-transparent",
    fadeBottomLarge:
      "pointer-events-none absolute right-0 bottom-0 left-0 h-8 rounded-b-xl bg-linear-to-t from-background to-transparent",
    fadeTop:
      "pointer-events-none absolute top-0 right-0 left-0 z-10 h-4 bg-linear-to-b from-background to-transparent",
    scroll: "",
    triggerButton:
      "flex cursor-pointer items-center justify-center py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground",
  },
  variants: {
    mode: {
      autoScroll: {
        scroll: "pointer-events-none max-h-44 overflow-hidden",
      },
      collapsed: {
        scroll: "max-h-20 overflow-hidden",
      },
      expanded: {
        scroll: "max-h-92 overflow-auto",
      },
      static: {
        scroll: "",
      },
    },
  },
});

const {
  container,
  fadeBottom,
  fadeBottomLarge,
  fadeTop,
  scroll,
  triggerButton,
} = viewportStyles();

export function VirtualizedScrollingText({
  autoScrollToBottom = false,
  content,
  highlightedLines,
}: {
  autoScrollToBottom?: boolean;
  content: string;
  highlightedLines?: string[];
}) {
  "use no memo";
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Remove trailing empty line when not auto-scrolling
  const cleanedContent =
    !autoScrollToBottom && content.endsWith("\n")
      ? content.slice(0, -1)
      : content;
  const lines = cleanedContent.split("\n");

  const displayLines =
    highlightedLines && highlightedLines.length > 0 ? highlightedLines : lines;

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

  // Stick to bottom when autoScrollToBottom is true
  useEffect(() => {
    if (!autoScrollToBottom || !scrollContainerRef.current) {
      return;
    }

    const lastItem = virtualizer.getVirtualItems().at(-1);

    if (lastItem) {
      virtualizer.scrollToIndex(displayLines.length - 1, {
        align: "end",
        behavior: "auto",
      });
    }
  }, [displayLines.length, autoScrollToBottom, virtualizer]);

  // Scroll to top when autoScrollToBottom becomes false
  useEffect(() => {
    if (autoScrollToBottom || !scrollContainerRef.current) {
      return;
    }

    virtualizer.scrollToIndex(0, {
      align: "start",
      behavior: "auto",
    });
  }, [autoScrollToBottom, virtualizer]);

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
        const isHighlighted = highlightedLines && highlightedLines.length > 0;

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

  if (autoScrollToBottom) {
    return (
      <div className={container()}>
        <div
          className={scroll({ mode: "autoScroll" })}
          ref={scrollContainerRef}
        >
          {contentInner}
        </div>
        {canScrollUp && <div className={fadeTop()} />}
        {canScrollDown && <div className={fadeBottom()} />}
      </div>
    );
  }

  // When done loading, wrap in collapsible similar to user-message
  // Only show collapsible if content exceeds collapsed height (max-h-20 = 80px)
  const collapsedMaxHeight = 4 * 20; // max-h-20 = 4rem = 80px
  const needsCollapsible = totalSize > collapsedMaxHeight;

  if (!needsCollapsible) {
    return (
      <div className={container()}>
        <div
          className={scroll({ mode: "static" })}
          ref={scrollContainerRef}
          style={{ overflowY: "hidden" }}
        >
          {contentInner}
        </div>
      </div>
    );
  }

  return (
    <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
      {isExpanded ? (
        <>
          <div className={container()}>
            <div
              className={scroll({ mode: "expanded" })}
              ref={scrollContainerRef}
            >
              {contentInner}
            </div>
          </div>
          <CollapsibleContent>
            <div
              className={triggerButton()}
              onClick={() => {
                setIsExpanded(false);
              }}
            >
              <ChevronUp className="size-3" />
            </div>
          </CollapsibleContent>
        </>
      ) : (
        <>
          <div className={container()}>
            <div
              className={scroll({ mode: "collapsed" })}
              ref={scrollContainerRef}
            >
              {contentInner}
            </div>
            <div className={fadeBottomLarge()} />
          </div>
          <CollapsibleTrigger asChild>
            <div className={triggerButton()}>
              <ChevronDown className="size-3" />
            </div>
          </CollapsibleTrigger>
        </>
      )}
    </Collapsible>
  );
}
