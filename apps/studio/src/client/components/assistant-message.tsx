import { type SessionMessagePart } from "@quests/workspace/client";
import { memo } from "react";

import { Markdown } from "./markdown";

interface AssistantMessageProps {
  part: SessionMessagePart.TextPart;
}

export const AssistantMessage = memo(function AssistantMessage({
  part,
}: AssistantMessageProps) {
  return (
    <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert break-words overflow-wrap-anywhere">
      <Markdown markdown={part.text} />
    </div>
  );
});
