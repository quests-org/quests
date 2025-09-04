import { err, ok, Result, safeTry } from "neverthrow";
import { alphabetical, parallel } from "radashi";

import { publisher } from "../rpc/publisher";
import { Session } from "../schemas/session";
import { SessionMessage } from "../schemas/session/message";
import { SessionMessagePart } from "../schemas/session/message-part";
import { type StoreId } from "../schemas/store-id";
import { type AppConfig } from "./app-config/types";
import { getParsedStorageItem } from "./get-parsed-storage-item";
import { getSessionsStoreStorage } from "./get-session-store-storage";
import { setParsedStorageItem } from "./set-parsed-storage-item";
import { StorageKey } from "./storage-key";

export namespace Store {
  export function getMessageIds(
    sessionId: StoreId.Session,
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      const storage = yield* getSessionsStoreStorage(appConfig);

      const messageKeys = await storage.getKeys(
        StorageKey.messages(sessionId),
        { signal },
      );

      return ok(messageKeys.map(StorageKey.extractMessageId));
    });
  }

  export function getMessageIdsAfter(
    sessionId: StoreId.Session,
    parentMessageId: StoreId.Message,
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      const messageIdsResult = yield* getMessageIds(sessionId, appConfig, {
        signal,
      });
      const sortedMessageIds = alphabetical(messageIdsResult, (id) => id);

      const parentIndex = sortedMessageIds.indexOf(parentMessageId);
      if (parentIndex === -1) {
        return ok([]);
      }

      const messagesAfterParent = sortedMessageIds.slice(parentIndex + 1);
      return ok(messagesAfterParent);
    });
  }

  export function getMessagesWithParts(
    {
      appConfig,
      messageIds,
      sessionId,
    }: {
      appConfig: AppConfig;
      messageIds?: StoreId.Message[];
      sessionId: StoreId.Session;
    },
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      const messageIdsResult =
        messageIds ?? (yield* getMessageIds(sessionId, appConfig, { signal }));

      const messageResults = await parallel(
        { limit: 10, signal },
        alphabetical(messageIdsResult, (id) => id),
        async (messageId) => {
          return getMessageWithParts(
            { appConfig, messageId, sessionId },
            { signal },
          );
        },
      );

      return Result.combine(messageResults);
    });
  }

  export function getMessageWithParts(
    {
      appConfig,
      messageId,
      sessionId,
    }: {
      appConfig: AppConfig;
      messageId: StoreId.Message;
      sessionId: StoreId.Session;
    },
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      const storage = yield* getSessionsStoreStorage(appConfig);

      const parseResult = yield* getParsedStorageItem(
        StorageKey.message(sessionId, messageId),
        SessionMessage.Schema,
        storage,
        { signal },
      );

      const message = parseResult;
      const partsResult = yield* getParts(
        message.metadata.sessionId,
        message.id,
        appConfig,
        { signal },
      );

      return ok({ ...message, parts: partsResult });
    });
  }

  export function getPartIds(
    sessionId: StoreId.Session,
    messageId: StoreId.Message,
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      const storage = yield* getSessionsStoreStorage(appConfig);

      const partKeys = await storage.getKeys(
        StorageKey.parts(sessionId, messageId),
        { signal },
      );

      return ok(partKeys.map(StorageKey.extractPartId));
    });
  }

  export function getParts(
    sessionId: StoreId.Session,
    messageId: StoreId.Message,
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      const storage = yield* getSessionsStoreStorage(appConfig);

      const partIdsResult = yield* getPartIds(sessionId, messageId, appConfig, {
        signal,
      });

      const partResults = await parallel(
        { limit: 10, signal },
        alphabetical(partIdsResult, (id) => id),
        async (partId) => {
          const partKey = StorageKey.part(sessionId, messageId, partId);
          return getParsedStorageItem(
            partKey,
            SessionMessagePart.CoercedSchema,
            storage,
            { signal },
          );
        },
      );

      return Result.combine(partResults);
    });
  }

  export function getSession(
    sessionId: StoreId.Session,
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      const storage = yield* getSessionsStoreStorage(appConfig);

      const parseResult = yield* getParsedStorageItem(
        StorageKey.session(sessionId),
        Session.Schema,
        storage,
        { signal },
      );

      return ok(parseResult);
    });
  }

  export function getSessions(
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      const sessionIds = yield* getStoreId(appConfig, { signal });

      const sessionResults = await parallel(
        { limit: 10, signal },
        alphabetical(sessionIds, (id) => id),
        async (sessionId) => {
          return getSession(sessionId, appConfig, { signal });
        },
      );

      return Result.combine(sessionResults);
    });
  }

  export function getSessionWithMessagesAndParts(
    sessionId: StoreId.Session,
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      const storage = yield* getSessionsStoreStorage(appConfig);

      const parseResult = yield* getParsedStorageItem(
        StorageKey.session(sessionId),
        Session.Schema,
        storage,
        { signal },
      );

      const messagesResult = yield* getMessagesWithParts(
        {
          appConfig,
          sessionId,
        },
        { signal },
      );

      return ok({ ...parseResult, messages: messagesResult });
    });
  }

  // Helper functions to retrieve IDs from storage keys
  export function getStoreId(
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      const storage = yield* getSessionsStoreStorage(appConfig);

      const sessionKeys = await storage.getKeys(StorageKey.sessions(), {
        signal,
      });

      return ok(sessionKeys.map(StorageKey.extractSessionId));
    });
  }

  export function removeMessage(
    messageId: StoreId.Message,
    sessionId: StoreId.Session,
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      const storage = yield* getSessionsStoreStorage(appConfig);

      const partIds = yield* getPartIds(sessionId, messageId, appConfig, {
        signal,
      });
      for (const partId of partIds) {
        await storage.removeItem(
          StorageKey.part(sessionId, messageId, partId),
          { signal },
        );
      }
      await storage.removeItem(StorageKey.message(sessionId, messageId), {
        signal,
      });
      publisher.publish("message.removed", {
        messageId,
        sessionId,
        subdomain: appConfig.subdomain,
      });
      return ok(undefined);
    });
  }

  export function removeSession(
    sessionId: StoreId.Session,
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      const storage = yield* getSessionsStoreStorage(appConfig);

      await storage.removeItem(StorageKey.session(sessionId), { signal });

      const messageIds = yield* getMessageIds(sessionId, appConfig, {
        signal,
      });
      for (const messageId of messageIds) {
        const partIds = yield* getPartIds(sessionId, messageId, appConfig, {
          signal,
        });
        for (const partId of partIds) {
          await storage.removeItem(
            StorageKey.part(sessionId, messageId, partId),
            { signal },
          );
        }
        await storage.removeItem(StorageKey.message(sessionId, messageId), {
          signal,
        });
      }
      return ok(undefined);
    });
  }

  export function saveMessage(
    message: SessionMessage.Type,
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      const storage = yield* getSessionsStoreStorage(appConfig);

      const savedMessage = yield* setParsedStorageItem(
        StorageKey.message(message.metadata.sessionId, message.id),
        message,
        SessionMessage.Schema,
        storage,
        { signal },
      );

      publisher.publish("message.updated", {
        messageId: savedMessage.id,
        sessionId: savedMessage.metadata.sessionId,
        subdomain: appConfig.subdomain,
      });

      return ok(savedMessage);
    });
  }

  export async function saveMessages(
    messages: SessionMessage.Type[],
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    const [firstMessage, ...rest] = messages;
    if (firstMessage) {
      const firstSessionId = firstMessage.metadata.sessionId;
      const messagesWithSessionMismatch = rest.filter(
        (message) => message.metadata.sessionId !== firstSessionId,
      );

      if (messagesWithSessionMismatch.length > 0) {
        return err({
          message: `Some messages do not belong to session ${firstSessionId}: ${messagesWithSessionMismatch.map((m) => m.id).join(", ")}`,
          type: "session-mismatch" as const,
        });
      }
    }

    const updateResults = await parallel(
      { limit: 10, signal },
      messages,
      async (message) => {
        return saveMessage(message, appConfig, { signal });
      },
    );

    return Result.combine(updateResults);
  }

  export function saveMessageWithParts(
    message: SessionMessage.WithParts,
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      // Check that all parts belong to the same session
      const partsWithSessionMismatch = message.parts.filter(
        (part) => part.metadata.sessionId !== message.metadata.sessionId,
      );

      if (partsWithSessionMismatch.length > 0) {
        return err({
          message: `Some parts do not belong to session ${message.metadata.sessionId}: ${partsWithSessionMismatch.map((p) => p.metadata.id).join(", ")}`,
          type: "session-mismatch" as const,
        });
      }

      // Check that all parts belong to the same message
      const partsWithMessageMismatch = message.parts.filter(
        (part) => part.metadata.messageId !== message.id,
      );

      if (partsWithMessageMismatch.length > 0) {
        return err({
          message: `Some parts do not belong to message ${message.id}: ${partsWithMessageMismatch.map((p) => p.metadata.id).join(", ")}`,
          type: "message-mismatch" as const,
        });
      }

      const { parts, ...rest } = message;
      yield* saveMessage(rest, appConfig, { signal });
      yield* await saveParts(parts, appConfig, { signal });
      return ok(message);
    });
  }

  export function savePart(
    part: SessionMessagePart.Type,
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      const storage = yield* getSessionsStoreStorage(appConfig);

      const savedPart = yield* setParsedStorageItem(
        StorageKey.part(
          part.metadata.sessionId,
          part.metadata.messageId,
          part.metadata.id,
        ),
        part,
        SessionMessagePart.CoercedSchema,
        storage,
        { signal },
      );

      publisher.publish("part.updated", {
        messageId: savedPart.metadata.messageId,
        partId: savedPart.metadata.id,
        sessionId: savedPart.metadata.sessionId,
        subdomain: appConfig.subdomain,
      });

      return ok(savedPart);
    });
  }

  export async function saveParts(
    parts: SessionMessagePart.Type[],
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    // Check that all parts belong to the same session
    const [firstPart] = parts;
    if (firstPart) {
      const firstSessionId = firstPart.metadata.sessionId;
      for (const part of parts) {
        if (part.metadata.sessionId !== firstSessionId) {
          return err({
            message: `Part ${part.metadata.id} does not belong to session ${firstSessionId}`,
            type: "session-mismatch" as const,
          });
        }
      }

      // Check that all parts belong to the same message
      const firstMessageId = firstPart.metadata.messageId;
      for (const part of parts) {
        if (part.metadata.messageId !== firstMessageId) {
          return err({
            message: `Part ${part.metadata.id} does not belong to message ${firstMessageId}`,
            type: "message-mismatch" as const,
          });
        }
      }
    }

    const updateResults = await parallel(
      { limit: 10, signal },
      parts,
      async (part) => {
        return savePart(part, appConfig, { signal });
      },
    );

    return Result.combine(updateResults);
  }

  export function saveSession(
    session: Session.Type,
    appConfig: AppConfig,
    { signal }: { signal?: AbortSignal } = {},
  ) {
    return safeTry(async function* () {
      const storage = yield* getSessionsStoreStorage(appConfig);

      const savedSession = yield* setParsedStorageItem(
        StorageKey.session(session.id),
        session,
        Session.Schema,
        storage,
        { signal },
      );

      publisher.publish("session.updated", {
        sessionId: savedSession.id,
        subdomain: appConfig.subdomain,
      });

      return ok(savedSession);
    });
  }
}
