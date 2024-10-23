import { type HeartbeatResponse } from "@quests/workspace/for-shim";

export type IframeMessage =
  | {
      type: "app-status";
      value: HeartbeatResponse["status"];
    }
  | {
      type: "display-mode";
      value: "bottom" | "corner" | "full";
    }
  | { type: "reload-window" };

export type IframeMessageHandler = (message: IframeMessage) => void;
