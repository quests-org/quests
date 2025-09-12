import { StoreId } from "../schemas/store-id";

export namespace StorageKey {
  const SEPARATOR = ":";
  export const MESSAGES_KEY = "messages";

  export function extractMessageId(messageKey: string): StoreId.Message {
    return StoreId.MessageSchema.parse(messageKey.split(SEPARATOR).at(-1));
  }

  export function extractPartId(partKey: string): StoreId.Part {
    return StoreId.PartSchema.parse(partKey.split(SEPARATOR).at(-1));
  }

  export function extractSessionId(sessionKey: string): StoreId.Session {
    return StoreId.SessionSchema.parse(sessionKey.split(SEPARATOR).at(-1));
  }

  export function message(
    sessionId: StoreId.Session,
    messageId: StoreId.Message,
  ) {
    return [StorageKey.messages(sessionId), messageId].join(SEPARATOR);
  }

  export function messages(sessionId: StoreId.Session) {
    return [MESSAGES_KEY, sessionId].join(SEPARATOR);
  }

  export function part(
    sessionId: StoreId.Session,
    messageId: StoreId.Message,
    partId: StoreId.Part,
  ) {
    return [StorageKey.parts(sessionId, messageId), partId].join(SEPARATOR);
  }

  export function parts(
    sessionId: StoreId.Session,
    messageId: StoreId.Message,
  ) {
    return ["parts", sessionId, messageId].join(SEPARATOR);
  }

  export function session(sessionId: StoreId.Session) {
    return [StorageKey.sessions(), sessionId].join(SEPARATOR);
  }

  export function sessions() {
    return "sessions";
  }
}
