import { atom } from "jotai";

export const lastSeenLogIdAtom = atom<null | string>(null);
