import { type SessionMessagePart } from "@quests/workspace/client";
import { memo } from "react";

import { SessionMarkdown } from "./session-markdown";

interface AssistantMessageProps {
  assetBaseUrl: string;
  part: SessionMessagePart.TextPart;
}

export const AssistantMessage = memo(function AssistantMessage({
  assetBaseUrl,
  part,
}: AssistantMessageProps) {
  const messageText = part.text;

  return (
    <div className="group flex flex-col items-start">
      <SessionMarkdown
        assetBaseUrl={assetBaseUrl}
        className="w-full"
        markdown={messageText}
      />
    </div>
  );
});
