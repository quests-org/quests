export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unit = sizes[i] ?? sizes.at(-1) ?? "B";

  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${unit}`;
}
