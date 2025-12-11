import { WORKSPACE_FOLDER } from "@quests/workspace/electron";
import { app } from "electron";
import path from "node:path";

export function getWorkspaceFolder(): string {
  return path.join(app.getPath("userData"), WORKSPACE_FOLDER);
}
