import { type AIGatewayModel } from "@quests/ai-gateway";

import type { InternalToolName } from "../tools/all";
import type { AnyAgentTool } from "../tools/types";

import { type AppConfig } from "../lib/app-config/types";
import { type SessionMessage } from "../schemas/session/message";
import { type StoreId } from "../schemas/store-id";

export interface Agent<T extends AgentTools> {
  agentTools: T;
  availableSubagents?: AgentName[];
  description?: string;
  getMessages: ({
    appConfig,
    sessionId,
  }: {
    appConfig: AppConfig;
    sessionId: StoreId.Session;
  }) =>
    | Promise<SessionMessage.ContextWithParts[]>
    | SessionMessage.ContextWithParts[];
  getTools: () => Promise<AnyAgentTool[]>;
  name: AgentName;
  onFinish: (options: {
    appConfig: AppConfig;
    model: AIGatewayModel.Type;
    parentMessageId: StoreId.Message;
    sessionId: StoreId.Session;
    signal: AbortSignal;
  }) => Promise<void>;
  onStart: (options: {
    appConfig: AppConfig;
    sessionId: StoreId.Session;
    signal: AbortSignal;
  }) => Promise<void>;
  shouldContinue: (options: {
    messages: SessionMessage.WithParts[];
  }) => Promise<boolean>;
}

export type AgentName = "explorer" | "main";

export type AgentTools = Partial<Record<InternalToolName, AnyAgentTool>>;

export type AnyAgent = Agent<AgentTools>;
