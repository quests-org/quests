import {
  type AssistantModelMessage,
  type ModelMessage,
  type SystemModelMessage,
  type ToolModelMessage,
  type ToolResultPart,
  type UserModelMessage,
} from "ai";
import { alphabetical } from "radashi";

import { type Session } from "../schemas/session";
import { SessionMessage } from "../schemas/session/message";
import { type SessionMessagePart } from "../schemas/session/message-part";
import { type StoreId } from "../schemas/store-id";
import { TOOLS_FOR_MODEL_OUTPUT } from "../tools/all";
import { isToolPart } from "./is-tool-part";

export async function sessionToMarkdown(
  rootSession: Session.WithMessagesAndParts,
  childSessions: Map<StoreId.Session, Session.WithMessagesAndParts>,
  { includeContextMessages = false }: { includeContextMessages?: boolean } = {},
): Promise<string> {
  const contextMessages = rootSession.messages.filter(
    (m) => m.role === "session-context",
  );
  const nonContextMessages = rootSession.messages.filter(
    (m) => m.role !== "session-context",
  );

  const orderedMessages = [
    ...(includeContextMessages
      ? alphabetical(contextMessages, (m) => m.id)
      : []),
    ...alphabetical(nonContextMessages, (m) => m.id),
  ];

  const modelMessages = await SessionMessage.toModelMessages(
    orderedMessages,
    TOOLS_FOR_MODEL_OUTPUT,
  );

  const taskSessionIds = buildTaskSessionIdMap(rootSession);

  const parts: string[] = [`# Session: ${rootSession.title}`, ""];

  let turn = 0;
  const toolCounter = { count: 0 };
  let i = 0;
  while (i < modelMessages.length) {
    const message = modelMessages[i];
    if (!message) {
      i++;
      continue;
    }

    if (message.role === "user" || message.role === "assistant") {
      turn++;
    }

    if (message.role === "assistant") {
      const nextMessage = modelMessages[i + 1];
      const toolMessage =
        nextMessage?.role === "tool" ? nextMessage : undefined;

      const rendered = await renderAssistantMessage(
        message,
        toolMessage,
        childSessions,
        taskSessionIds,
        turn,
        toolCounter,
      );
      for (const line of rendered) {
        parts.push(line);
      }
      parts.push("");

      i += toolMessage ? 2 : 1;
      continue;
    }

    if (message.role === "tool") {
      // Orphaned tool message (not consumed by an assistant message above)
      const rendered = renderOrphanedToolMessage(message, toolCounter);
      for (const line of rendered) {
        parts.push(line);
      }
      parts.push("");
      i++;
      continue;
    }

    const rendered = await renderMessage(
      message,
      childSessions,
      taskSessionIds,
      turn,
      toolCounter,
    );
    for (const line of rendered) {
      parts.push(line);
    }
    parts.push("");
    i++;
  }

  const lastMessage = orderedMessages.at(-1);
  if (lastMessage?.role === "assistant") {
    const pendingToolParts = lastMessage.parts.filter(
      (p) =>
        isToolPart(p) &&
        (p.state === "input-available" || p.state === "input-streaming"),
    ) as SessionMessagePart.ToolPart[];

    if (pendingToolParts.length > 0) {
      turn++;
      parts.push(`## Assistant (Turn ${turn})`, "");
      for (const part of pendingToolParts) {
        toolCounter.count++;
        // Tool name is encoded in the type as "tool-{name}"
        const toolName = part.type.slice("tool-".length);
        parts.push(
          "",
          `### Tool Call ${toolCounter.count}: ${toolName} *(incomplete)*`,
          "",
          inputToXml(toolName, part.input),
        );
      }
      parts.push("");
    }
  }

  return parts.join("\n");
}

function buildTaskSessionIdMap(
  session: Session.WithMessagesAndParts,
): Map<string, StoreId.Session> {
  const map = new Map<string, StoreId.Session>();
  for (const message of session.messages) {
    for (const part of message.parts) {
      if (part.type === "tool-task" && part.state === "output-available") {
        map.set(part.toolCallId, part.output.sessionId);
      }
    }
  }
  return map;
}

function inputToXml(toolName: string, input: unknown): string {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return `<${toolName}>${JSON.stringify(input)}</${toolName}>`;
  }

  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length === 0) {
    return `<${toolName} />`;
  }

  const inner = entries
    .map(([key, value]) => {
      const text =
        typeof value === "string" ? value : JSON.stringify(value, null, 2);
      return `<${key}>${text}</${key}>`;
    })
    .join("\n");

  return `<${toolName}>\n${inner}\n</${toolName}>`;
}

async function renderAssistantMessage(
  message: AssistantModelMessage,
  toolMessage: ToolModelMessage | undefined,
  childSessions: Map<StoreId.Session, Session.WithMessagesAndParts>,
  taskSessionIds: Map<string, StoreId.Session>,
  turn: number,
  toolCounter: { count: number },
): Promise<string[]> {
  const lines: string[] = [`## Assistant (Turn ${turn})`, ""];

  // Build a map of toolCallId -> tool result from the tool message
  const toolResultMap = new Map<
    string,
    { output: ToolResultPart["output"]; toolName: string }
  >();
  if (toolMessage) {
    for (const part of toolMessage.content) {
      if (part.type !== "tool-approval-response") {
        toolResultMap.set(part.toolCallId, {
          output: part.output,
          toolName: part.toolName,
        });
      }
    }
  }

  const content = message.content;
  if (typeof content === "string") {
    lines.push(content);
    return lines;
  }

  for (const part of content) {
    switch (part.type) {
      case "file": {
        lines.push(
          `*[File: ${part.filename ?? "unknown"} (${part.mediaType})]*`,
        );
        break;
      }
      case "reasoning": {
        lines.push(
          `*[Reasoning: ${part.text.slice(0, 100)}${part.text.length > 100 ? "..." : ""}]*`,
        );
        break;
      }
      case "text": {
        lines.push(part.text);
        break;
      }
      case "tool-call": {
        toolCounter.count++;
        lines.push(
          "",
          `### Tool Call ${toolCounter.count}: ${part.toolName}`,
          "",
          inputToXml(part.toolName, part.input),
        );

        if (part.toolName === "task") {
          const childSessionId = taskSessionIds.get(part.toolCallId);
          if (childSessionId) {
            const childSession = childSessions.get(childSessionId);
            if (childSession) {
              const childMarkdown = await sessionToMarkdown(
                childSession,
                childSessions,
              );
              lines.push(
                "",
                "---",
                "",
                `> **Subagent: ${childSession.title}**`,
                "",
                ...childMarkdown.split("\n").map((line) => `> ${line}`),
                "",
                "---",
              );
            }
          }
        }

        const result = toolResultMap.get(part.toolCallId);
        if (result) {
          lines.push(
            ...renderToolResult(
              result.toolName,
              result.output,
              toolCounter.count,
            ),
          );
        }
        break;
      }
      case "tool-result": {
        // tool-result parts embedded in assistant messages (some providers)
        toolCounter.count++;
        const resultLines = renderToolResult(
          part.toolName,
          part.output,
          toolCounter.count,
        );
        lines.push(...resultLines);
        break;
      }
    }
  }

  return lines;
}

async function renderMessage(
  message: ModelMessage,
  childSessions: Map<StoreId.Session, Session.WithMessagesAndParts>,
  taskSessionIds: Map<string, StoreId.Session>,
  turn: number,
  toolCounter: { count: number },
): Promise<string[]> {
  switch (message.role) {
    case "assistant": {
      return renderAssistantMessage(
        message,
        undefined,
        childSessions,
        taskSessionIds,
        turn,
        toolCounter,
      );
    }
    case "system": {
      return renderSystemMessage(message);
    }
    case "tool": {
      return renderOrphanedToolMessage(message, toolCounter);
    }
    case "user": {
      return renderUserMessage(message, turn);
    }
  }
}

function renderOrphanedToolMessage(
  message: ToolModelMessage,
  toolCounter: { count: number },
): string[] {
  const lines: string[] = [];

  for (const part of message.content) {
    if (part.type === "tool-approval-response") {
      continue;
    }

    toolCounter.count++;
    const toolLines = renderToolResult(
      part.toolName,
      part.output,
      toolCounter.count,
    );
    lines.push(...toolLines);
  }

  return lines;
}

function renderSystemMessage(message: SystemModelMessage): string[] {
  return ["## System", "", message.content];
}

function renderToolResult(
  toolName: string,
  output: ToolResultPart["output"],
  toolCallIndex: number,
): string[] {
  const lines: string[] = [
    "",
    `### Tool Result ${toolCallIndex}: ${toolName}`,
    "",
  ];

  switch (output.type) {
    case "error-json":
    case "json": {
      lines.push("```json", JSON.stringify(output.value, null, 2), "```");
      break;
    }
    case "error-text":
    case "text": {
      lines.push(output.value);
      break;
    }
    case "execution-denied": {
      lines.push(
        `*Execution denied${output.reason ? `: ${output.reason}` : ""}*`,
      );
      break;
    }
  }

  return lines;
}

function renderUserMessage(message: UserModelMessage, turn: number): string[] {
  const lines: string[] = [`## User (Turn ${turn})`, ""];

  const content = message.content;
  if (typeof content === "string") {
    lines.push(content);
    return lines;
  }

  for (const part of content) {
    switch (part.type) {
      case "file": {
        lines.push(
          `*[File: ${part.filename ?? "unknown"} (${part.mediaType})]*`,
        );
        break;
      }
      case "image": {
        lines.push(`*[Image]*`);
        break;
      }
      case "text": {
        lines.push(part.text);
        break;
      }
    }
  }

  return lines;
}
