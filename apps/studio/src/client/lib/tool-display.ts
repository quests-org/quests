import { type ToolName } from "@quests/workspace/client";
import {
  Brain,
  Eye,
  FilePlus,
  HelpCircle,
  List,
  type LucideIcon,
  Pencil,
  Search,
  Stethoscope,
  Terminal,
  TriangleAlert,
} from "lucide-react";

// | undefined ensures runtime type safety
const TOOL_DISPLAY_NAMES: Record<ToolName, string | undefined> = {
  choose: "Waiting for answer",
  edit_file: "Edited",
  glob: "Searched files",
  grep: "Searched text",
  read_file: "Read",
  run_diagnostics: "Ran diagnostics",
  run_shell_command: "Ran command",
  think: "Thought",
  unavailable: "Unknown tool",
  write_file: "Created",
};

const TOOL_STREAMING_DISPLAY_NAMES: Record<ToolName, string | undefined> = {
  choose: "Thinking about answer",
  edit_file: "Editing a file",
  glob: "Searching files",
  grep: "Searching text",
  read_file: "Reading file",
  run_diagnostics: "Running diagnostics",
  run_shell_command: "Running command",
  think: "Thinking",
  unavailable: "Unknown tool",
  write_file: "Creating a file",
};

const TOOL_STREAMING_DISPLAY_NAMES_WITH_VALUE: Record<
  ToolName,
  string | undefined
> = {
  choose: TOOL_STREAMING_DISPLAY_NAMES.choose,
  edit_file: "Editing",
  glob: "Searching for",
  grep: "Searching for",
  read_file: "Reading",
  run_diagnostics: TOOL_STREAMING_DISPLAY_NAMES.run_diagnostics,
  run_shell_command: TOOL_STREAMING_DISPLAY_NAMES.run_shell_command,
  think: TOOL_STREAMING_DISPLAY_NAMES.think,
  unavailable: TOOL_STREAMING_DISPLAY_NAMES.unavailable,
  write_file: "Creating",
};

export const TOOL_ICONS: Record<ToolName, LucideIcon | undefined> = {
  choose: HelpCircle,
  edit_file: Pencil,
  glob: List,
  grep: Search,
  read_file: Eye,
  run_diagnostics: Stethoscope,
  run_shell_command: Terminal,
  think: Brain,
  unavailable: TriangleAlert,
  write_file: FilePlus,
};

export function getToolLabel(toolName: ToolName): string {
  return TOOL_DISPLAY_NAMES[toolName] ?? "Unknown tool";
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
