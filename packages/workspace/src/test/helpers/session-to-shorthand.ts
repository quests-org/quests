import type { Result } from "neverthrow";

import type { Session } from "../../schemas/session";
import type { SessionMessage } from "../../schemas/session/message";

import { isToolPart } from "../../lib/is-tool-part";
import { type SessionMessagePart } from "../../schemas/session/message-part";

export function sessionToShorthand(
  sessionResult: Result<Session.WithMessagesAndParts, unknown>,
): string {
  if (sessionResult.isErr()) {
    return `<session-error>${JSON.stringify(sessionResult.error)}</session-error>`;
  }

  const session = sessionResult.value;
  const messageCount = ` count="${session.messages.length}"`;
  const title = ` title="${session.title}"`;
  const messages = session.messages.map(messageToShorthand);

  return `<session${title}${messageCount}>\n${indent(messages.join("\n"))}\n</session>`;
}

function indent(text: string, level = 1): string {
  const spaces = "  ".repeat(level);
  return text
    .split("\n")
    .map((line) => (line ? `${spaces}${line}` : line))
    .join("\n");
}

function messagePartToShorthand(part: SessionMessagePart.Type): string {
  if (isToolPart(part)) {
    const toolName = ` tool="${part.type.replace("tool-", "")}"`;
    const state = ` state="${part.state}"`;
    const callId = ` callId="${part.toolCallId}"`;

    let content = "";

    switch (part.state) {
      case "input-available":
      case "input-streaming": {
        if (part.input !== undefined) {
          content = `\n${indent("<input>")}\n${indent(JSON.stringify(part.input, null, 2), 2)}\n${indent("</input>")}\n`;
        }

        break;
      }
      case "output-available": {
        content += `\n${indent("<input>")}\n${indent(JSON.stringify(part.input, null, 2), 2)}\n${indent("</input>")}`;
        content += `\n${indent("<output>")}\n${indent(JSON.stringify(part.output, null, 2), 2)}\n${indent("</output>")}\n`;

        break;
      }
      case "output-error": {
        content += `\n${indent("<input>")}\n${indent(JSON.stringify(part.input || part.rawInput || "none", null, 2), 2)}\n${indent("</input>")}`;
        content += `\n${indent(`<error>${part.errorText}</error>`)}\n`;

        break;
      }
      // No default
    }

    return `<tool${toolName}${state}${callId}>${content}</tool>`;
  }

  switch (part.type) {
    case "data-fileAttachment": {
      const filename = ` filename="${part.data.filename}"`;
      const mimeType = ` mimeType="${part.data.mimeType}"`;
      const size = ` size="${part.data.size}"`;
      return `<data-fileAttachment${filename}${mimeType}${size} />`;
    }
    case "data-gitCommit": {
      const ref = ` ref="${part.data.ref}"`;
      return `<data-gitCommit${ref} />`;
    }
    case "file": {
      const filename = part.filename ? ` filename="${part.filename}"` : "";
      const mediaType = ` mediaType="${part.mediaType}"`;
      return `<file${filename}${mediaType}>${part.url}</file>`;
    }
    case "reasoning": {
      const state = ` state="${part.state ?? "unknown"}"`;
      return `<reasoning${state}>${part.text}</reasoning>`;
    }
    case "source-document": {
      const filename = part.filename ? ` filename="${part.filename}"` : "";
      const mediaType = ` mediaType="${part.mediaType}"`;
      return `<source-document${filename}${mediaType}>${part.title}</source-document>`;
    }
    case "source-url": {
      const title = part.title ? ` title="${part.title}"` : "";
      return `<source-url${title}>${part.url}</source-url>`;
    }
    case "step-start": {
      const stepCount = ` step="${part.metadata.stepCount}"`;
      return `<step-start${stepCount} />`;
    }
    case "text": {
      const state = part.state ? ` state="${part.state}"` : "";
      return `<text${state}>${part.text}</text>`;
    }
    default: {
      const unknownPart: never = part;
      return `<unknown-part type="${(unknownPart as { type: string }).type}" />`;
    }
  }
}

function messageToShorthand(message: SessionMessage.WithParts): string {
  const parts = message.parts.map(messagePartToShorthand);

  switch (message.role) {
    case "assistant": {
      const finishReason = ` finishReason="${message.metadata.finishReason}"`;
      const usage = message.metadata.usage;
      const tokens = usage ? ` tokens="${usage.totalTokens || 0}"` : "";
      const modelId = ` model="${message.metadata.modelId}"`;
      const provider = ` provider="${message.metadata.providerId}"`;

      return parts.length > 0
        ? `<assistant${finishReason}${tokens}${modelId}${provider}>\n${indent(parts.join("\n"))}\n</assistant>`
        : `<assistant${finishReason}${tokens}${modelId}${provider} />`;
    }
    case "session-context": {
      return `<session-context ${message.metadata.agentName} realRole="${message.metadata.realRole}" />`;
    }
    case "system": {
      return parts.length > 0
        ? `<system>\n${indent(parts.join("\n"))}\n</system>`
        : `<system />`;
    }
    case "user": {
      return parts.length > 0
        ? `<user>\n${indent(parts.join("\n"))}\n</user>`
        : `<user />`;
    }
    default: {
      const unknownMessage: never = message;
      return `<unknown-message role="${(unknownMessage as { role: string }).role}" />`;
    }
  }
}
