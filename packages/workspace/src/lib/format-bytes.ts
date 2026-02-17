export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0B";
  }

  const k = 1024;
  if (bytes < k) {
    return `${bytes}B`;
  }

  const sizes = ["KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes / k) / Math.log(k));
  const unit = sizes[i] ?? sizes.at(-1) ?? "TB";
  const value = Math.round(bytes / k ** (i + 1));

  return `${value}${unit}`;
}
