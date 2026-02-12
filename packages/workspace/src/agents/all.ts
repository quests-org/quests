import { mainAgent } from "./main";
import { retrievalAgent } from "./retrieval";
import { type AgentName, type AnyAgent } from "./types";

export const AGENTS = {
  main: mainAgent,
  retrieval: retrievalAgent,
} as const satisfies Record<AgentName, AnyAgent>;
