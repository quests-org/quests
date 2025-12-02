import { type SessionMessagePart, StoreId } from "@quests/workspace/client";

export function createUserMessage({
  files,
  prompt,
  sessionId,
}: {
  files?: { content: string; name: string }[];
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

  const mappedFiles = files?.map((f) => ({
    content: f.content,
    filename: f.name,
  }));

  return {
    files: mappedFiles,
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
