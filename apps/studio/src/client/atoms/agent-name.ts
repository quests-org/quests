import { type AgentName } from "@quests/workspace/client";
import { atomWithStorage } from "jotai/utils";

export const agentNameAtom = atomWithStorage<AgentName>(
  // Old name when we briefly had this stored per project
  "agent-name-$$new-tab$$",
  "app-builder",
);
