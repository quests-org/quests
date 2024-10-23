import type { ToolName } from "../tools/types";

export function isInteractiveTool(toolName: ToolName): boolean {
  return toolName === "choose";
}
