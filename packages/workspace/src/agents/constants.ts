import { appBuilderAgent } from "./app-builder";
import { chatAgent } from "./chat";
import { type AgentName, type AnyAgent } from "./types";

export const AGENTS = {
  "app-builder": appBuilderAgent,
  chat: chatAgent,
} as const satisfies Record<AgentName, AnyAgent>;
