import { app } from "electron";
import path from "node:path";

export function getWorkspaceFolder(): string {
  return path.join(app.getPath("userData"), "workspace");
}
