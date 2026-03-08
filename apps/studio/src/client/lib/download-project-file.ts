import { safe } from "@orpc/client";

import { type ProjectFileViewerFile } from "../atoms/project-file-viewer";
import { rpcClient } from "../rpc/client";

export async function downloadProjectFile({
  blob,
  filename,
  filePath,
  projectSubdomain,
  versionRef,
}: ProjectFileViewerFile & {
  blob: Blob;
}) {
  let downloadFilename = filename;

  if (filePath && projectSubdomain && versionRef) {
    const [error, versionRefs] = await safe(
      rpcClient.workspace.project.git.fileVersionRefs.call({
        filePath,
        projectSubdomain,
      }),
    );

    if (!error && versionRefs.length > 1) {
      const versionNumber = versionRefs.indexOf(versionRef) + 1;

      const lastDotIndex = filename.lastIndexOf(".");
      if (lastDotIndex > 0) {
        const name = filename.slice(0, lastDotIndex);
        const ext = filename.slice(lastDotIndex);
        downloadFilename = `${name}-v${versionNumber}${ext}`;
      } else {
        downloadFilename = `${filename}-v${versionNumber}`;
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = downloadFilename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
