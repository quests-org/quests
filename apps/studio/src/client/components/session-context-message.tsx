import {
  type SessionMessage,
  type SessionMessagePart,
} from "@quests/workspace/client";
import { memo } from "react";

import { Markdown } from "./markdown";

interface ContextMessageProps {
  message: SessionMessage.ContextWithParts;
  part: SessionMessagePart.TextPart;
}

export const ContextMessage = memo(function ContextMessage({
  message,
  part,
}: ContextMessageProps) {
  const { realRole } = message.metadata;

  const roleDisplay =
    realRole === "system"
      ? "System"
      : realRole === "user"
        ? "User"
        : "Assistant";

  return (
    <div className="w-full">
      <div className="text-xs text-foreground/70 font-medium mb-1">
        {roleDisplay} prompt
      </div>
      <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert wrap-break-word">
        <Markdown markdown={part.text} />
      </div>
    </div>
  );
});
