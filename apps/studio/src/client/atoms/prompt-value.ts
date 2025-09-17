import { type AppSubdomain } from "@quests/workspace/client";
import { atom } from "jotai";
import { atomFamily, atomWithStorage } from "jotai/utils";

export type PromptValueAtomKey = "$$new-tab$$" | AppSubdomain;

export const promptValueAtomFamily = atomFamily((key: PromptValueAtomKey) =>
  key === "$$new-tab$$" ? atom("") : atomWithStorage(`prompt-value-${key}`, ""),
);
