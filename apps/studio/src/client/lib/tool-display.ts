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
  choose: "Answered",
  edit_file: "Edited",
  glob: "Searched files",
  grep: "Searched text",
  read_file: "Read",
  run_diagnostics: "Ran diagnostics",
  run_shell_command: "Ran command",
  think: "Thought",
  unavailable: "Unknown tool",
  write_file: "Wrote",
};

const TOOL_STREAMING_DISPLAY_NAMES: Record<ToolName, string | undefined> = {
  choose: "Answering",
  edit_file: "Editing a file",
  glob: "Searching files",
  grep: "Searching text",
  read_file: "Reading",
  run_diagnostics: "Running diagnostics",
  run_shell_command: "Running command",
  think: "Thinking",
  unavailable: "Unknown tool",
  write_file: "Writing a file",
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

export function getToolDisplayName(toolName: ToolName): string {
  return TOOL_DISPLAY_NAMES[toolName] ?? "Unknown tool";
}

export function getToolStreamingDisplayName(toolName: ToolName): string {
  return TOOL_STREAMING_DISPLAY_NAMES[toolName] ?? "Processing";
}
