import { type ProjectSubdomain } from "@quests/workspace/client";
import { atom } from "jotai";

export interface ProjectFileViewerFile {
  filename: string;
  filePath: string;
  mimeType: string;
  projectSubdomain: ProjectSubdomain;
  url: string;
  versionRef: string;
}

interface ProjectFileViewerState {
  currentIndex: number;
  files: ProjectFileViewerFile[];
  isOpen: boolean;
  mode: "modal" | "panel";
}

const initialState: ProjectFileViewerState = {
  currentIndex: 0,
  files: [],
  isOpen: false,
  mode: "panel",
};

export const projectFileViewerAtom = atom<ProjectFileViewerState>(initialState);

export const openProjectFileViewerAtom = atom(
  null,
  (
    _get,
    set,
    {
      currentIndex = 0,
      files,
    }: {
      currentIndex?: number;
      files: ProjectFileViewerFile[];
    },
  ) => {
    set(projectFileViewerAtom, {
      currentIndex,
      files,
      isOpen: true,
      mode: "panel",
    });
  },
);

export const expandProjectFileViewerAtom = atom(null, (get, set) => {
  const state = get(projectFileViewerAtom);
  set(projectFileViewerAtom, { ...state, mode: "modal" });
});

export const collapseProjectFileViewerAtom = atom(null, (get, set) => {
  const state = get(projectFileViewerAtom);
  set(projectFileViewerAtom, { ...state, mode: "panel" });
});

export const closeProjectFileViewerAtom = atom(null, (_get, set) => {
  set(projectFileViewerAtom, initialState);
});

export const setProjectFileViewerIndexAtom = atom(
  null,
  (get, set, index: number) => {
    const state = get(projectFileViewerAtom);
    set(projectFileViewerAtom, {
      ...state,
      currentIndex: index,
    });
  },
);
