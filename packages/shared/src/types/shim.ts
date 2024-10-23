export type ShimIFrameMessage =
  | { type: "history-back" }
  | { type: "history-forward" }
  | { type: "reload-window" };
