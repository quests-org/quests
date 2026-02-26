import {
  MAX_PROMPT_STORAGE_LENGTH,
  type ProjectSubdomain,
} from "@quests/workspace/client";
import { atom, type SetStateAction } from "jotai";
import { atomFamily, atomWithStorage } from "jotai/utils";
import { debounce } from "radashi";

import { rpcClient } from "../rpc/client";

export type PromptValueAtomKey =
  | "$$new-tab$$"
  | "$$template$$"
  | ProjectSubdomain;

export const promptInputRefAtom = atom<HTMLTextAreaElement | null>(null);

const createProjectPromptStorage = (subdomain: ProjectSubdomain) => {
  let lastValue: string | undefined;

  const save = debounce({ delay: 1000 }, async (newValue: string) => {
    await rpcClient.workspace.project.state.set.call({
      state: { promptDraft: newValue },
      subdomain,
    });
  });

  return {
    getItem: (_key: string, initialValue: string) => {
      return lastValue ?? initialValue;
    },
    removeItem: (_key: string) => {
      lastValue = undefined;
      save("");
    },
    setItem: (_key: string, newValue: string) => {
      lastValue = newValue;
      if (newValue.length > MAX_PROMPT_STORAGE_LENGTH) {
        return;
      }
      save(newValue);
    },
    // Using subscribe to avoid making this an async storage. Easier for consumer
    // and the persistence of this is not critical.
    subscribe: (
      _key: string,
      callback: (value: string) => void,
      initialValue: string,
    ) => {
      let isCancelled = false;
      rpcClient.workspace.project.state.get
        .call({ subdomain })
        .then((state) => {
          if (isCancelled) {
            return;
          }
          const newValue = state.promptDraft ?? initialValue;
          if (lastValue === undefined) {
            lastValue = newValue;
            callback(newValue);
          }
        })
        .catch(() => {
          // ignore
        });
      return () => {
        isCancelled = true;
      };
    },
  };
};

export const promptValueAtomFamily = atomFamily((key: PromptValueAtomKey) => {
  if (key === "$$new-tab$$" || key === "$$template$$") {
    return atom("");
  }

  return atomWithStorage(
    `prompt-draft-${key}`,
    "",
    createProjectPromptStorage(key),
  );
});

export const appendToPromptAtom = atom(
  null,
  (
    get,
    set,
    {
      key,
      update,
    }: { key: PromptValueAtomKey; update: SetStateAction<string> },
  ) => {
    const valueAtom = promptValueAtomFamily(key);
    const prev = get(valueAtom);
    set(valueAtom, typeof update === "function" ? update(prev) : update);
    get(promptInputRefAtom)?.focus();
  },
);
