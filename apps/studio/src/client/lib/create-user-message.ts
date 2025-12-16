import {
  type SessionMessagePart,
  StoreId,
  type Upload,
} from "@quests/workspace/client";

export function createUserMessage({
  files,
  prompt,
  sessionId,
}: {
  files?: Upload.Type[];
  prompt: string;
  sessionId: StoreId.Session;
}) {
  const messageId = StoreId.newMessageId();
  const createdAt = new Date();
  const parts: SessionMessagePart.Type[] = [];

  if (prompt.trim()) {
    parts.push({
      metadata: {
        createdAt,
        id: StoreId.newPartId(),
        messageId,
        sessionId,
      },
      text: prompt.trim(),
      type: "text",
    });
  }

  return {
    files,
    message: {
      id: messageId,
      metadata: {
        createdAt,
        sessionId,
      },
      parts,
      role: "user" as const,
    },
  };
}
