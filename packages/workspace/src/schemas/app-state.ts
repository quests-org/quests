import { z } from "zod";

import { type WorkspaceApp } from "./app";
import { StoreId } from "./store-id";

const SessionTagSchema = z.enum([
  "agent.alive",
  "agent.done",
  "agent.paused",
  "agent.running",
  "agent.using-non-read-only-tools",
]);

export type SessionTag = z.output<typeof SessionTagSchema>;

export const WorkspaceAppStateSchema = z.object({
  app: z.custom<WorkspaceApp>(),
  sessionActors: z.array(
    z.object({
      sessionId: StoreId.SessionSchema,
      tags: z.array(SessionTagSchema),
    }),
  ),
});

export type WorkspaceAppState = z.output<typeof WorkspaceAppStateSchema>;
