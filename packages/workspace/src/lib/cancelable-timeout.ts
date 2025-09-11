export class TimeoutError extends Error {
  constructor(durationMs: number) {
    super(`Operation timed out after ${durationMs}ms`);
    this.name = "TimeoutError";
  }
}

export function cancelableTimeout(ms: number) {
  const controller = new AbortController();
  let canceled = false;
  let timeoutId: NodeJS.Timeout | null = null;
  let started = false;

  const start = () => {
    if (started || canceled) {
      return;
    }
    started = true;
    timeoutId = setTimeout(() => {
      if (!canceled) {
        controller.abort(new TimeoutError(ms));
      }
    }, ms);
  };

  controller.signal.addEventListener("abort", () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });

  return {
    cancel: () => {
      canceled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    },
    controller,
    start,
  };
}
