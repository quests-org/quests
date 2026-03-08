import { useSyncExternalStore } from "react";

const getServerSnapshot = () => true;

export function useMediaQuery(query: string) {
  const subscribe = (callback: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", callback);
    return () => {
      mql.removeEventListener("change", callback);
    };
  };

  const getSnapshot = () => window.matchMedia(query).matches;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
