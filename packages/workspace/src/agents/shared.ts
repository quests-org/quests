import { dedent, sift } from "radashi";

import { fileTree } from "../lib/file-tree";
import { getCurrentDate } from "../lib/get-current-date";
import { getSystemInfo } from "../lib/get-system-info";
import { isToolPart } from "../lib/is-tool-part";
import { type AbsolutePath } from "../schemas/paths";
import { type SessionMessage } from "../schemas/session/message";
import { StoreId } from "../schemas/store-id";
import { type AgentName } from "./types";

export function createContextMessage({
  agentName,
  now,
  sessionId,
  textParts,
}: {
  agentName: AgentName;
  now: Date;
  sessionId: StoreId.Session;
  textParts: (boolean | null | string | undefined)[];
}): SessionMessage.ContextWithParts {
  const userMessageId = StoreId.newMessageId();

  const text = sift(
    textParts.map((part) =>
      typeof part === "string" ? part.trim() : undefined,
    ),
  ).join("\n\n");

  return {
    id: userMessageId,
    metadata: {
      agentName,
      createdAt: now,
      realRole: "user",
      sessionId,
    },
    parts: [
      {
        metadata: {
          createdAt: now,
          endedAt: now,
          id: StoreId.newPartId(),
          messageId: userMessageId,
          sessionId,
        },
        state: "done",
        text,
        type: "text",
      },
    ],
    role: "session-context",
  };
}

export function createSystemMessage({
  agentName,
  now,
  sessionId,
  text,
}: {
  agentName: AgentName;
  now: Date;
  sessionId: StoreId.Session;
  text: string;
}): SessionMessage.ContextWithParts {
  const systemMessageId = StoreId.newMessageId();

  return {
    id: systemMessageId,
    metadata: {
      agentName,
      createdAt: now,
      realRole: "system",
      sessionId,
    },
    parts: [
      {
        metadata: {
          createdAt: now,
          endedAt: now,
          id: StoreId.newPartId(),
          messageId: systemMessageId,
          sessionId,
        },
        state: "done",
        text,
        type: "text",
      },
    ],
    role: "session-context",
  };
}

export async function getProjectLayoutContext(appDir: AbsolutePath) {
  const fileTreeResult = await fileTree(appDir);

  return fileTreeResult.match(
    (tree) => dedent`
      <project_layout>
      This is the current project directory structure. All files and folders shown below exist right now. This structure will not update during the conversation, but should be considered accurate at the start.
      \`\`\`plaintext
      ${tree}
      \`\`\`
      </project_layout>
    `,
    () => "",
  );
}

export function getSystemInfoText() {
  const now = getCurrentDate();
  return dedent`
    <system_info>
    Operating system: ${getSystemInfo()}
    Current date: ${now.toLocaleDateString("en-US", { day: "numeric", month: "long", weekday: "long", year: "numeric" })}
    </system_info>
  `.trim();
}

export function shouldContinueWithToolCalls({
  messages,
}: {
  messages: SessionMessage.WithParts[];
}) {
  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  // Continue if no assistant message was found
  if (!lastAssistantMessage) {
    return Promise.resolve(true);
  }

  // Continue if last assistant message has tool calls
  return Promise.resolve(
    lastAssistantMessage.parts.some((part) => isToolPart(part)),
  );
}
