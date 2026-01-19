import { cn } from "@/client/lib/utils";
import { type SessionMessagePart } from "@quests/workspace/client";
import { ChevronUp } from "lucide-react";
import { debounce } from "radashi";
import { memo, useEffect, useRef, useState } from "react";

import { CopyButton } from "./copy-button";
import { RelativeTime } from "./relative-time";
import { SessionMarkdown } from "./session-markdown";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface UserMessageProps {
  part: SessionMessagePart.TextPart;
}

export const UserMessage = memo(function UserMessage({
  part,
}: UserMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const messageText = part.text;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(messageText);
  };

  useEffect(() => {
    const element = contentRef.current;
    if (!element) {
      return;
    }

    const checkOverflow = () => {
      const isContentOverflowing = element.scrollHeight > element.clientHeight;
      setIsOverflowing(isContentOverflowing);
    };

    checkOverflow();

    const debouncedCheckOverflow = debounce({ delay: 100 }, checkOverflow);
    const resizeObserver = new ResizeObserver(debouncedCheckOverflow);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [messageText]);

  return (
    <div className="group flex flex-col items-end">
      <div className="relative max-w-full rounded-xl border border-border/50 bg-muted px-4 py-2 text-foreground">
        <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
          <div
            className={cn(!isExpanded && "max-h-24 overflow-hidden")}
            ref={contentRef}
          >
            <SessionMarkdown markdown={messageText} />
          </div>

          {isOverflowing && (
            <CollapsibleTrigger asChild>
              <button
                className="absolute inset-0 cursor-pointer"
                type="button"
              />
            </CollapsibleTrigger>
          )}

          {!isExpanded && isOverflowing && (
            <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-16 rounded-b-xl bg-linear-to-t from-muted to-transparent" />
          )}

          <CollapsibleContent>
            <div
              className="flex cursor-pointer items-center justify-center gap-1 pt-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => {
                setIsExpanded(false);
              }}
              title="Click to collapse"
            >
              <span>Collapse</span>
              <ChevronUp className="size-3" />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        <RelativeTime
          className="cursor-default"
          date={part.metadata.createdAt}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <CopyButton
              className="rounded p-1 transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
              iconSize={12}
              onCopy={handleCopy}
            />
          </TooltipTrigger>
          <TooltipContent>Copy message</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});

UserMessage.displayName = "UserMessageHeader";
