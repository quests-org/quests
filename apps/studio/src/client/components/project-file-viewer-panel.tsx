import {
  closeProjectFileViewerAtom,
  expandProjectFileViewerAtom,
  projectFileViewerAtom,
} from "@/client/atoms/project-file-viewer";
import { useAtomValue, useSetAtom } from "jotai";

import { ProjectFileViewer } from "./project-file-viewer";

export function ProjectFileViewerPanel() {
  const state = useAtomValue(projectFileViewerAtom);
  const closeViewer = useSetAtom(closeProjectFileViewerAtom);
  const expandViewer = useSetAtom(expandProjectFileViewerAtom);

  const currentFile = state.files[state.currentIndex];

  if (!currentFile) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div className="flex size-full" key={currentFile.url}>
          <ProjectFileViewer
            file={currentFile}
            fullSize
            isInPanel
            onClose={closeViewer}
            onExpand={expandViewer}
          />
        </div>
      </div>
    </div>
  );
}
