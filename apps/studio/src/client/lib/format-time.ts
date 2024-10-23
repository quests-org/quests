export function formatDuration(durationMs: number): string {
  const seconds = Math.round(durationMs / 1000);

  if (seconds < 1) {
    return `${Math.round(durationMs)}ms`;
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

export function formatDurationFromDates(
  startTime?: Date,
  endTime?: Date,
): string {
  if (!startTime || !endTime) {
    return "";
  }
  const durationMs = endTime.getTime() - startTime.getTime();
  const seconds = Math.round(durationMs / 1000);

  if (seconds < 1) {
    return "1s";
  }

  return `${seconds}s`;
}
