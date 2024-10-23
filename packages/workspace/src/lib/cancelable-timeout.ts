export class TimeoutError extends Error {
  constructor(durationMs: number) {
    super(`Operation timed out after ${durationMs}ms`);
    this.name = "TimeoutError";
  }
}

export function cancelableTimeout(ms: number) {
  const controller = new AbortController();
  let canceled = false;
  const timeoutId = setTimeout(() => {
    if (!canceled) {
      controller.abort(new TimeoutError(ms));
    }
  }, ms);
  controller.signal.addEventListener("abort", () => {
    clearTimeout(timeoutId);
  });
  return {
    cancel: () => {
      canceled = true;
      clearTimeout(timeoutId);
    },
    controller,
  };
}
