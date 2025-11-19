import { type HeartbeatResponse } from "@quests/workspace/for-shim";

export interface ClientToIframeMessage {
  type: "hide-failed-to-render" | "show-failed-to-render";
}

export type IframeMessage =
  | {
      type: "app-status";
      value: HeartbeatResponse["status"];
    }
  | { type: "dismiss-recovery" }
  | { type: "open-console" }
  | { type: "reload-window" };

export type IframeMessageHandler = (message: IframeMessage) => void;
