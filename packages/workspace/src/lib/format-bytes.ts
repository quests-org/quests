export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unit = sizes[i] ?? sizes.at(-1) ?? "Bytes";

  return `${Number.parseFloat((bytes / k ** i).toFixed(decimals))}${unit}`;
}
