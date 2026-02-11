import { type Result } from "neverthrow";

import { type AgentName } from "../agents/types";
import { type SessionMessage, type StoreId } from "../client";
import { type TypedError } from "./errors";

export type SpawnAgentFunction = (params: {
  agentName: AgentName;
  prompt: string;
  signal: AbortSignal;
}) => Promise<{
  messagesResult: Result<SessionMessage.WithParts[], TypedError.Type>;
  sessionId: StoreId.Session;
}>;
