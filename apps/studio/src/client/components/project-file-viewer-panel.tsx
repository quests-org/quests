import {
  openFileViewerAtom,
  type ProjectFileViewerFile,
} from "@/client/atoms/project-file-viewer";
import { useSetAtom } from "jotai";

import { ProjectFileViewer } from "./project-file-viewer";

export function ProjectFileViewerPanel({
  file,
  onClose,
}: {
  file: ProjectFileViewerFile;
  onClose: () => void;
}) {
  const openFileViewer = useSetAtom(openFileViewerAtom);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div className="flex size-full" key={file.url}>
          <ProjectFileViewer
            file={file}
            fullSize
            isInPanel
            onClose={onClose}
            onExpand={() => {
              openFileViewer({ files: [file], isOpen: true });
            }}
          />
        </div>
      </div>
    </div>
  );
}
