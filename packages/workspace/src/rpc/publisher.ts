import { EventPublisher } from "@orpc/server";

import { type WorkspaceSnapshot } from "../machines/workspace";
import { type StoreId } from "../schemas/store-id";
import {
  type AppSubdomain,
  type ProjectSubdomain,
} from "../schemas/subdomains";

export const publisher = new EventPublisher<{
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
    messageId: StoreId.Message;
    partId: StoreId.Part;
    sessionId: StoreId.Session;
    subdomain: AppSubdomain;
  };
  "project.removed": {
    subdomain: ProjectSubdomain;
  };
  "project.updated": {
    subdomain: ProjectSubdomain;
  };
  "session.updated": {
    sessionId: StoreId.Session;
    subdomain: AppSubdomain;
  };
  "workspaceActor.snapshot": WorkspaceSnapshot;
}>({
  maxBufferedEvents: 1, // Holds only last event in memory
});
