import { safe } from "@orpc/client";
import { type ProjectSubdomain } from "@quests/workspace/client";

import { rpcClient } from "../rpc/client";

export async function downloadProjectFile({
  blob,
  filename,
  filePath,
  projectSubdomain,
  versionRef,
}: {
  blob: Blob;
  filename: string;
  filePath: string;
  projectSubdomain: ProjectSubdomain;
  versionRef: string;
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

      if (versionNumber > 1) {
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
