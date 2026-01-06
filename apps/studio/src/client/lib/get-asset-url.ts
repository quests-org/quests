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
    return `${baseUrl}?versionRef=${versionRef}`;
  }

  return baseUrl;
}
