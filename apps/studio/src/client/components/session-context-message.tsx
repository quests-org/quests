import {
  type SessionMessage,
  type SessionMessagePart,
} from "@quests/workspace/client";
import { memo } from "react";

import { SessionMarkdown } from "./session-markdown";

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
      <div className="mb-1 text-xs font-medium text-foreground/70">
        {roleDisplay} prompt
      </div>
      <SessionMarkdown markdown={part.text} />
    </div>
  );
});
