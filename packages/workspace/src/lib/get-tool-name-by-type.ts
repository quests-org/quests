import { type ToolName } from "../tools/types";

export function getToolNameByType<T extends ToolName>(type: `tool-${T}`): T {
  return type.replace("tool-", "") as T;
}
