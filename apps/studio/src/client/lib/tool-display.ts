import {
  type SessionMessagePart,
  type ToolName,
} from "@quests/workspace/client";
import {
  Brain,
  Eye,
  FilePlus,
  Globe,
  HelpCircle,
  Image,
  List,
  type LucideIcon,
  Pencil,
  Search,
  Stethoscope,
  Terminal,
  TriangleAlert,
} from "lucide-react";

type AgentName = "explorer" | "main";

// Agent-specific display names for the task tool
const TASK_DISPLAY_NAMES: Record<AgentName, string> = {
  explorer: "Explored",
  main: "Assisted",
};

const TASK_STREAMING_DISPLAY_NAMES: Record<AgentName, string> = {
  explorer: "Exploring",
  main: "Assisting",
};

const TASK_FAILED_DISPLAY_NAMES: Record<AgentName, string> = {
  explorer: "Failed to explore",
  main: "Failed to assist",
};

// | undefined ensures runtime type safety
const TOOL_DISPLAY_NAMES: Record<ToolName, string | undefined> = {
  choose: "Waiting for answer",
  edit_file: "Edited",
  generate_image: "Generated image",
  glob: "Searched files",
  grep: "Searched text",
  read_file: "Read",
  run_diagnostics: "Ran diagnostics",
  run_shell_command: "Ran command",
  task: "Task",
  think: "Thought",
  unavailable: "Unknown tool",
  web_search: "Searched web",
  write_file: "Created",
};

const TOOL_STREAMING_DISPLAY_NAMES: Record<ToolName, string | undefined> = {
  choose: "Thinking about answer",
  edit_file: "Editing a file",
  generate_image: "Generating an image",
  glob: "Searching files",
  grep: "Searching text",
  read_file: "Reading file",
  run_diagnostics: "Running diagnostics",
  run_shell_command: "Running command",
  task: "Task",
  think: "Thinking",
  unavailable: "Unknown tool",
  web_search: "Searching the web",
  write_file: "Creating a file",
};

const TOOL_STREAMING_DISPLAY_NAMES_WITH_VALUE: Record<
  ToolName,
  string | undefined
> = {
  choose: TOOL_STREAMING_DISPLAY_NAMES.choose,
  edit_file: "Editing",
  generate_image: "Generating",
  glob: "Searching for",
  grep: "Searching for",
  read_file: "Reading",
  run_diagnostics: TOOL_STREAMING_DISPLAY_NAMES.run_diagnostics,
  run_shell_command: TOOL_STREAMING_DISPLAY_NAMES.run_shell_command,
  task: TOOL_STREAMING_DISPLAY_NAMES.task,
  think: TOOL_STREAMING_DISPLAY_NAMES.think,
  unavailable: TOOL_STREAMING_DISPLAY_NAMES.unavailable,
  web_search: "Searching for",
  write_file: "Creating",
};

const TOOL_FAILED_DISPLAY_NAMES: Record<ToolName, string | undefined> = {
  choose: "Failed to answer",
  edit_file: "Failed to edit file",
  generate_image: "Failed to generate image",
  glob: "Failed to search files",
  grep: "Failed to search text",
  read_file: "Failed to read file",
  run_diagnostics: "Failed to run diagnostics",
  run_shell_command: "Failed to run command",
  task: "Failed to run task",
  think: "Failed to think",
  unavailable: "Unknown tool",
  web_search: "Failed to search the web",
  write_file: "Failed to create file",
};

export const TOOL_ICONS: Record<ToolName, LucideIcon | undefined> = {
  choose: HelpCircle,
  edit_file: Pencil,
  generate_image: Image,
  glob: List,
  grep: Search,
  read_file: Eye,
  run_diagnostics: Stethoscope,
  run_shell_command: Terminal,
  task: undefined,
  think: Brain,
  unavailable: TriangleAlert,
  web_search: Globe,
  write_file: FilePlus,
};

export function getToolLabel(toolName: ToolName): string {
  return TOOL_DISPLAY_NAMES[toolName] ?? "Unknown tool";
}

export function getToolLabelForPart({
  hasCapabilityFailure,
  hasValue,
  part,
  state,
  toolName,
}: {
  hasCapabilityFailure?: boolean;
  hasValue?: boolean;
  part: SessionMessagePart.ToolPart;
  state: "completed" | "failed" | "streaming";
  toolName: ToolName;
}): string {
  if (toolName !== "task") {
    switch (state) {
      case "completed": {
        return hasCapabilityFailure
          ? getToolFailedLabel(toolName)
          : getToolLabel(toolName);
      }
      case "failed": {
        return getToolFailedLabel(toolName);
      }
      case "streaming": {
        return getToolStreamingLabel(toolName, hasValue);
      }
    }
  }

  const taskAgentName =
    part.type === "tool-task" && part.input
      ? part.input.subagent_type
      : undefined;

  const taskState =
    state === "completed" && hasCapabilityFailure ? "failed" : state;

  return getTaskToolLabel(taskAgentName, taskState);
}

export function getToolStreamingLabel(
  toolName: ToolName,
  hasValue = false,
): string {
  const names = hasValue
    ? TOOL_STREAMING_DISPLAY_NAMES_WITH_VALUE
    : TOOL_STREAMING_DISPLAY_NAMES;
  return names[toolName] ?? "Processing";
}

function getTaskToolLabel(
  agentName: string | undefined,
  state: "completed" | "failed" | "streaming",
): string {
  if (
    agentName !== undefined &&
    agentName !== "explorer" &&
    agentName !== "main"
  ) {
    return "Unknown agent";
  }

  if (!agentName) {
    return state === "completed"
      ? "Assisted"
      : state === "streaming"
        ? "Assisting"
        : "Failed to assist";
  }

  switch (state) {
    case "completed": {
      return TASK_DISPLAY_NAMES[agentName];
    }
    case "failed": {
      return TASK_FAILED_DISPLAY_NAMES[agentName];
    }
    case "streaming": {
      return TASK_STREAMING_DISPLAY_NAMES[agentName];
    }
  }
}

function getToolFailedLabel(toolName: ToolName): string {
  return TOOL_FAILED_DISPLAY_NAMES[toolName] ?? "Tool failed";
}
