import { VERSION_REF_QUERY_PARAM } from "@quests/shared";

export function getAssetUrl({
  assetBase,
  filePath,
  versionRef,
}: {
  assetBase: string;
  filePath: string;
  versionRef?: string;
}): string {
  const cleanPath = filePath.startsWith("./") ? filePath.slice(2) : filePath;
  const baseUrl = `${assetBase}/${cleanPath}`;

  if (versionRef) {
    return `${baseUrl}?${VERSION_REF_QUERY_PARAM}=${versionRef}`;
  }

  return baseUrl;
}
