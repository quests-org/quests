import { atom } from "jotai";

interface FilePreviewState {
  file: null | {
    mimeType?: string;
    name: string;
    size?: number;
    url: string;
  };
  isOpen: boolean;
}

const initialState: FilePreviewState = {
  file: null,
  isOpen: false,
};

export const filePreviewAtom = atom<FilePreviewState>(initialState);

export const openFilePreviewAtom = atom(
  null,
  (
    _get,
    set,
    file: {
      mimeType?: string;
      name: string;
      size?: number;
      url: string;
    },
  ) => {
    set(filePreviewAtom, {
      file,
      isOpen: true,
    });
  },
);

export const closeFilePreviewAtom = atom(null, (_get, set) => {
  set(filePreviewAtom, initialState);
});
