const TEXT_MIME_TYPES = new Set([
  "application/gml+xml",
  "application/javascript", // Should never be used, since text/javascript is what our mime type library uses
  "application/json",
  "application/rss+xml",
  "application/vnd.google-earth.kml+xml",
  "application/xhtml+xml",
  "application/xml",
  "image/svg+xml",
]);

export function isTextMimeType(mimeType?: string): boolean {
  if (!mimeType) {
    return false;
  }

  if (mimeType.startsWith("text/")) {
    return true;
  }

  return TEXT_MIME_TYPES.has(mimeType);
}
