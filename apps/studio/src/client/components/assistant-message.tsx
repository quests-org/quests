import { type SessionMessagePart } from "@quests/workspace/client";
import { memo } from "react";

import { CopyButton } from "./copy-button";
import { Markdown } from "./markdown";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface AssistantMessageProps {
  part: SessionMessagePart.TextPart;
  showActions?: boolean;
}

export const AssistantMessage = memo(function AssistantMessage({
  part,
  showActions = true,
}: AssistantMessageProps) {
  const messageText = part.text;
  const isStreaming = part.state !== "done";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(messageText);
  };

  return (
    <div className="group flex flex-col items-start">
      <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert break-words overflow-wrap-anywhere">
        <Markdown markdown={messageText} />
      </div>
      {!isStreaming && showActions && (
        <div className="flex items-center gap-2 mt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <CopyButton
                className="p-1 rounded hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 text-muted-foreground"
                onCopy={handleCopy}
              />
            </TooltipTrigger>
            <TooltipContent>Copy message</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
});
