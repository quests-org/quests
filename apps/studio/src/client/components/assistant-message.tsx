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
      <div className="prose prose-sm w-full max-w-none text-sm leading-relaxed wrap-break-word dark:prose-invert">
        <Markdown markdown={messageText} />
      </div>
    </div>
  );
});
