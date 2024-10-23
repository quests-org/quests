export function truncateBuffer(buffer: Buffer, maxLength: number): string {
  if (buffer.length === 0) {
    return "";
  }

  if (buffer.length <= maxLength) {
    return buffer.toString();
  }

  const halfMax = Math.floor(maxLength / 2);
  const truncated = buffer.subarray(0, halfMax).toString();
  const remaining = buffer.length - halfMax;

  return `${truncated}... (truncated ${remaining} characters)`;
}
