import { safe } from "@orpc/client";
import { type ProjectSubdomain } from "@quests/workspace/client";
import { toast } from "sonner";

import { rpcClient } from "../rpc/client";
import { downloadProjectFile } from "./download-project-file";
import { isTextMimeType } from "./is-text-mime-type";

export async function copyFileToClipboard({
  filePath,
  mimeType,
  subdomain,
}: {
  filePath: string;
  mimeType: string;
  subdomain: ProjectSubdomain;
}) {
  const [error] = await safe(
    rpcClient.utils.copyFileToClipboard.call({ filePath, mimeType, subdomain }),
  );
  if (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "The file could not be copied to clipboard";
    toast.error("Failed to copy file", {
      closeButton: true,
      description: errorMessage,
      duration: 5000,
    });
    throw error;
  }
}

export async function downloadFile({
  filename,
  filePath,
  projectSubdomain,
  url,
  versionRef,
}: {
  filename: string;
  filePath: string;
  projectSubdomain: ProjectSubdomain;
  url: string;
  versionRef: string;
}) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const blob = await response.blob();
    await downloadProjectFile({
      blob,
      filename,
      filePath,
      projectSubdomain,
      versionRef,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unknown error occurred while downloading the file";
    toast.error("Failed to download file", {
      closeButton: true,
      description: `${errorMessage}\n\nFile: ${filePath}`,
      duration: 10_000,
    });
    throw error;
  }
}

export function isFileCopyable(mimeType: string, url: string) {
  return (
    isFileDownloadable(url) &&
    (isTextMimeType(mimeType) || mimeType.startsWith("image/"))
  );
}

export function isFileDownloadable(url: string) {
  if (!url.trim()) {
    return false;
  }

  if (url.startsWith("data:")) {
    return true;
  }

  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname === "localhost" || urlObj.hostname.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}
