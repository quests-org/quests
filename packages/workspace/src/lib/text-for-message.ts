import { type SessionMessage } from "../schemas/session/message";

export function textForMessage(message: SessionMessage.WithParts) {
  return message.parts
    .flatMap((part) => {
      switch (part.type) {
        case "text": {
          return [part.text];
        }
        default: {
          return [];
        }
      }
    })
    .join("\n");
}
