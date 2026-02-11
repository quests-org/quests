import { explorerAgent } from "./explorer";
import { mainAgent } from "./main";
import { type AgentName, type AnyAgent } from "./types";

export const AGENTS = {
  explorer: explorerAgent,
  main: mainAgent,
} as const satisfies Record<AgentName, AnyAgent>;
