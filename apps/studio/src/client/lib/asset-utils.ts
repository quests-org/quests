export function getAssetUrl({
  assetBase,
  filePath,
}: {
  assetBase: string;
  filePath: string;
}): string {
  const cleanPath = filePath.startsWith("./") ? filePath.slice(2) : filePath;
  return `${assetBase}/${cleanPath}`;
}
