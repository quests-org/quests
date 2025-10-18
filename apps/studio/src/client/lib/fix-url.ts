export function fixURL(url: string): string {
  let normalized = url.trim();
  if (!normalized) {
    return normalized;
  }

  normalized = normalized.replaceAll("\\", "/");

  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`;
  }

  normalized = normalized.replaceAll(/([^:]\/)\/+/g, "$1");

  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}
