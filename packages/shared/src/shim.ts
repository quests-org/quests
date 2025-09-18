export type { ConsoleLogType, ShimIFrameOutMessage } from "./schemas/shim";
export {
  ConsoleLogTypeSchema,
  ShimIFrameOutMessageSchema,
} from "./schemas/shim";

export type ShimIFrameInMessage =
  | { type: "history-back" }
  | { type: "history-forward" }
  | { type: "reload-window" };

export type ShimIFrameMessage = ShimIFrameInMessage;
