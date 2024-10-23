/**
 * A debug logger for the browser that allows for easily filtering in Chrome
 * DevTools.
 */
export const logger = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (...msg: any[]) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, no-console
      console.debug("[quests]", ...msg);
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression, no-console, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
  error: (...error: any[]) => console.error("[quests]", ...error),
};
