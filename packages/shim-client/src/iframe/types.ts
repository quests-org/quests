import { type HeartbeatResponse } from "@quests/workspace/for-shim";

export type IframeMessage =
  | {
      type: "app-status";
      value: HeartbeatResponse["status"];
    }
  | { type: "open-console" }
  | { type: "reload-window" };

export type IframeMessageHandler = (message: IframeMessage) => void;
