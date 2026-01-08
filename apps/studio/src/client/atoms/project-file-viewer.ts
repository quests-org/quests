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
}

const initialState: ProjectFileViewerState = {
  currentIndex: 0,
  files: [],
  isOpen: false,
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
    });
  },
);

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
