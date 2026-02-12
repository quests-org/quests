import { TASK_AGENT_NAMES, type TaskAgentName } from "../agents/types";

export function isTaskAgentName(name: string): name is TaskAgentName {
  return TASK_AGENT_NAMES.includes(name as unknown as TaskAgentName);
}
