import { cn } from "@/client/lib/utils";
import { type SessionMessagePart } from "@quests/workspace/client";
import { ChevronUp } from "lucide-react";
import { memo, useState } from "react";

import { CopyButton } from "./copy-button";
import { Markdown } from "./markdown";

interface UserMessageProps {
  part: SessionMessagePart.TextPart;
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });
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

  return (
    <div className="group flex flex-col items-end">
      <div className="bg-muted text-foreground rounded-xl px-4 py-2 border border-border/50 relative max-w-full">
        <div
          className={cn(
            "text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert break-words overflow-wrap-anywhere",
            shouldShowExpansion &&
              !isExpanded &&
              "max-h-32 overflow-hidden cursor-pointer",
          )}
          onClick={() => {
            if (shouldShowExpansion && !isExpanded) {
              setIsExpanded(true);
            }
          }}
        >
          <Markdown markdown={messageText} />
        </div>

        {shouldShowExpansion && !isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted to-transparent pointer-events-none rounded-b-xl" />
        )}

        {shouldShowExpansion && isExpanded && (
          <div
            className="flex items-center justify-center gap-1 pt-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              setIsExpanded(false);
            }}
            title="Click to collapse"
          >
            <span>Collapse</span>
            <ChevronUp className="size-3" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        <span>{formatDate(part.metadata.createdAt)}</span>
        <CopyButton
          className="p-1 rounded hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          iconSize={12}
          onCopy={handleCopy}
        />
      </div>
    </div>
  );
});

UserMessage.displayName = "UserMessageHeader";
