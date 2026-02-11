import { explorerAgent } from "./explorer";
import { mainAgent } from "./main";
import { retrievalAgent } from "./retrieval";
import { type AgentName, type AnyAgent } from "./types";

export const AGENTS = {
  explorer: explorerAgent,
  main: mainAgent,
  retrieval: retrievalAgent,
} as const satisfies Record<AgentName, AnyAgent>;
