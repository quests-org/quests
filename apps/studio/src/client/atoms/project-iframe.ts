import { atom } from "jotai";

// Simple atom to store the current project's iframe ref
// Only set when rendering a project-type app
export const projectIframeRefAtom =
  atom<null | React.RefObject<HTMLIFrameElement | null>>(null);
