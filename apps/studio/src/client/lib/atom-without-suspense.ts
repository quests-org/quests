import { atom, type Atom } from "jotai";
import { loadable } from "jotai/utils";

export function atomWithoutSuspense<T>(
  asyncAtom: Atom<Promise<T>>,
  fallback: T,
): Atom<T> {
  const loadableAtom = loadable(asyncAtom);

  return atom<T>((get) => {
    const loadableData = get(loadableAtom);
    if (loadableData.state === "hasData") {
      return loadableData.data;
    }
    return fallback;
  });
}
