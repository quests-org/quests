export function getAssetUrl({
  assetBase,
  filePath,
  messageId,
}: {
  assetBase: string;
  filePath: string;
  messageId?: string;
}): string {
  const cleanPath = filePath.startsWith("./") ? filePath.slice(2) : filePath;
  const baseUrl = `${assetBase}/${cleanPath}`;

  if (messageId) {
    return `${baseUrl}?messageId=${messageId}`;
  }

  return baseUrl;
}
