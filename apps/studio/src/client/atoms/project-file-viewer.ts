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
  isModalOpen: boolean;
}

const initialState: ProjectFileViewerState = {
  currentIndex: 0,
  files: [],
  isModalOpen: false,
};

export const projectFileViewerAtom = atom<ProjectFileViewerState>(initialState);

export const setFileViewerGalleryAtom = atom(
  null,
  (
    _get,
    set,
    {
      currentIndex = 0,
      files,
      isOpen = false,
    }: {
      currentIndex?: number;
      files: ProjectFileViewerFile[];
      isOpen?: boolean;
    },
  ) => {
    set(projectFileViewerAtom, (prev) => ({
      ...prev,
      currentIndex,
      files,
      isModalOpen: isOpen,
    }));
  },
);

export const closeFileViewerAtom = atom(null, (_get, set) => {
  set(projectFileViewerAtom, (prev) => ({
    ...prev,
    files: [],
    isModalOpen: false,
  }));
});

export const setProjectFileViewerIndexAtom = atom(
  null,
  (_get, set, index: number) => {
    set(projectFileViewerAtom, (prev) => ({ ...prev, currentIndex: index }));
  },
);
