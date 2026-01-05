import { EventPublisher } from "@orpc/server";

import { type WorkspaceSnapshot } from "../machines/workspace";
import { type SessionMessagePart } from "../schemas/session/message-part";
import { type StoreId } from "../schemas/store-id";
import {
  type AppSubdomain,
  type ProjectSubdomain,
} from "../schemas/subdomains";

export const publisher = new EventPublisher<{
  "appState.session.added": {
    sessionId: StoreId.Session;
    subdomain: AppSubdomain;
  };
  "appState.session.removed": {
    sessionId: StoreId.Session;
    subdomain: AppSubdomain;
  };
  "appState.session.tagsChanged": {
    sessionId: StoreId.Session;
    subdomain: AppSubdomain;
  };
  "message.removed": {
    messageId: StoreId.Message;
    sessionId: StoreId.Session;
    subdomain: AppSubdomain;
  };
  "message.updated": {
    messageId: StoreId.Message;
    sessionId: StoreId.Session;
    subdomain: AppSubdomain;
  };
  "part.updated": {
    part: SessionMessagePart.Type;
    subdomain: AppSubdomain;
  };
  "project.removed": {
    subdomain: ProjectSubdomain;
  };
  "project.updated": {
    subdomain: ProjectSubdomain;
  };
  "runtime.log.updated": {
    subdomain: AppSubdomain;
  };
  "session.removed": {
    sessionId: StoreId.Session;
    subdomain: AppSubdomain;
  };
  "session.updated": {
    sessionId: StoreId.Session;
    subdomain: AppSubdomain;
  };
  "workspaceActor.snapshot": WorkspaceSnapshot;
}>({
  maxBufferedEvents: 1, // Holds only last event in memory
});
