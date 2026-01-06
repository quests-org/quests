import { type ProjectSubdomain } from "@quests/workspace/client";
import { atom } from "jotai";

export interface FileViewerFile {
  filename: string;
  filePath?: string;
  mimeType?: string;
  projectSubdomain?: ProjectSubdomain;
  size?: number;
  url: string;
  versionRef?: string;
}

interface FileViewerState {
  currentIndex: number;
  files: FileViewerFile[];
  isOpen: boolean;
}

const initialState: FileViewerState = {
  currentIndex: 0,
  files: [],
  isOpen: false,
};

export const fileViewerAtom = atom<FileViewerState>(initialState);

export const openFileViewerAtom = atom(
  null,
  (
    _get,
    set,
    {
      currentIndex = 0,
      files,
    }: {
      currentIndex?: number;
      files: FileViewerFile[];
    },
  ) => {
    set(fileViewerAtom, {
      currentIndex,
      files,
      isOpen: true,
    });
  },
);

export const closeFileViewerAtom = atom(null, (_get, set) => {
  set(fileViewerAtom, initialState);
});

export const navigateFileViewerAtom = atom(
  null,
  (get, set, action: "next" | "prev" | number) => {
    const state = get(fileViewerAtom);
    if (!state.isOpen || state.files.length <= 1) {
      return;
    }

    let newIndex = state.currentIndex;
    if (typeof action === "number") {
      newIndex = action;
    } else if (action === "next") {
      newIndex = (state.currentIndex + 1) % state.files.length;
    } else {
      newIndex =
        state.currentIndex === 0
          ? state.files.length - 1
          : state.currentIndex - 1;
    }

    set(fileViewerAtom, {
      ...state,
      currentIndex: newIndex,
    });
  },
);
