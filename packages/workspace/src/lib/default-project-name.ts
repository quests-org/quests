import { type SessionMessage } from "../schemas/session/message";
import { textForMessage } from "./text-for-message";

const MAX_CHARS = 50;

export function defaultProjectName(
  message: SessionMessage.WithParts,
  prefix: string,
): string {
  const text = textForMessage(message).trim();

  if (!text) {
    return prefix;
  }

  const truncated =
    text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}…` : text;

  return `${prefix}: ${truncated}`;
}
