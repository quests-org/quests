import { cn } from "@/client/lib/utils";
import { type SessionMessagePart } from "@quests/workspace/client";
import { ChevronUp } from "lucide-react";
import { memo, useState } from "react";

import { CopyButton } from "./copy-button";
import { Markdown } from "./markdown";
import { RelativeTime } from "./relative-time";
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

  const messageText = part.text;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(messageText);
  };

  const shouldShowExpansion =
    messageText.length > 200 || messageText.split("\n").length > 5;

  if (!shouldShowExpansion) {
    return (
      <div className="group flex flex-col items-end">
        <div className="relative max-w-full rounded-xl border border-border/50 bg-muted px-4 py-2 text-foreground">
          <div className="prose prose-sm max-w-none text-sm leading-relaxed wrap-break-word dark:prose-invert">
            <Markdown markdown={messageText} />
          </div>
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
  }

  return (
    <div className="group flex flex-col items-end">
      <Collapsible
        className="relative max-w-full rounded-xl border border-border/50 bg-muted px-4 py-2 text-foreground"
        onOpenChange={setIsExpanded}
        open={isExpanded}
      >
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              "prose prose-sm max-w-none text-sm leading-relaxed wrap-break-word dark:prose-invert",
              !isExpanded && "max-h-32 cursor-pointer overflow-hidden",
            )}
          >
            <Markdown markdown={messageText} />
          </div>
        </CollapsibleTrigger>

        {!isExpanded && (
          <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-8 rounded-b-xl bg-linear-to-t from-muted to-transparent" />
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
