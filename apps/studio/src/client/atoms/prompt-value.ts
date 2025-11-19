import { type AppSubdomain } from "@quests/workspace/client";
import { atom } from "jotai";
import { atomFamily } from "jotai/utils";

export type PromptValueAtomKey = "$$new-tab$$" | AppSubdomain;

export const promptValueAtomFamily = atomFamily((_key: PromptValueAtomKey) =>
  atom(""),
);
