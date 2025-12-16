import { type HeartbeatResponse } from "@quests/workspace/for-shim";

export type ClientToIframeMessage =
  | { type: "hide-failed-to-render" }
  | { type: "set-studio-environment" }
  | { type: "show-failed-to-render" };

export type IframeMessage =
  | {
      type: "app-status";
      value: HeartbeatResponse["status"];
    }
  | { type: "dismiss-recovery" }
  | { type: "open-console" }
  | { type: "reload-window" };

export type IframeMessageHandler = (message: IframeMessage) => void;
