import { atom } from "jotai";

export interface FileViewerState {
  filename: string;
  isOpen: boolean;
  mimeType?: string;
  size?: number;
  url: string;
}

const initialState: FileViewerState = {
  filename: "",
  isOpen: false,
  mimeType: undefined,
  size: undefined,
  url: "",
};

export const fileViewerAtom = atom<FileViewerState>(initialState);

export const openFileViewerAtom = atom(
  null,
  (
    _get,
    set,
    {
      filename,
      mimeType,
      size,
      url,
    }: {
      filename: string;
      mimeType?: string;
      size?: number;
      url: string;
    },
  ) => {
    set(fileViewerAtom, {
      filename,
      isOpen: true,
      mimeType,
      size,
      url,
    });
  },
);

export const closeFileViewerAtom = atom(null, (_get, set) => {
  set(fileViewerAtom, initialState);
});
