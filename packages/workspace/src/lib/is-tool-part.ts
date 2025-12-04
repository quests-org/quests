import { type SessionMessagePart } from "../schemas/session/message-part";

export function isToolPart(
  part: SessionMessagePart.Type,
): part is SessionMessagePart.ToolPart {
  return part.type.startsWith("tool-");
}
