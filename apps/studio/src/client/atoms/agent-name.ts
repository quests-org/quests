import { type AgentName, type AppSubdomain } from "@quests/workspace/client";
import { atom } from "jotai";
import { atomFamily, atomWithStorage } from "jotai/utils";

export type AgentNameAtomKey = "$$new-tab$$" | AppSubdomain;

function getAgentNameStorageKey(key: AgentNameAtomKey): string {
  return `agent-name-${key}`;
}

export const agentNameAtomFamily = atomFamily((key: AgentNameAtomKey) =>
  key === "$$new-tab$$"
    ? atomWithStorage<AgentName>(getAgentNameStorageKey(key), "app-builder")
    : atom<AgentName>("app-builder"),
);
