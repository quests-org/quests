import { type SessionMessagePart } from "@quests/workspace/client";
import { memo } from "react";

import { Markdown } from "./markdown";

interface AssistantMessageProps {
  part: SessionMessagePart.TextPart;
}

export const AssistantMessage = memo(function AssistantMessage({
  part,
}: AssistantMessageProps) {
  const messageText = part.text;

  return (
    <div className="group flex flex-col items-start">
      <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert wrap-break-word w-full">
        <Markdown markdown={messageText} />
      </div>
    </div>
  );
});
