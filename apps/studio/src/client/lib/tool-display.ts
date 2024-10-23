import { type ToolName } from "@quests/workspace/client";
import {
  Brain,
  Eye,
  FilePlus,
  FolderTree,
  GitBranch,
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
  file_tree: "Listed files",
  glob: "Searched files",
  grep: "Searched text",
  read_file: "Read",
  run_diagnostics: "Ran diagnostics",
  run_git_commands: "Ran git commands",
  run_shell_command: "Ran command",
  think: "Thought",
  unavailable: "Unknown tool",
  write_file: "Wrote",
};

const TOOL_STREAMING_DISPLAY_NAMES: Record<ToolName, string | undefined> = {
  choose: "Answering",
  edit_file: "Editing a file",
  file_tree: "Listing files",
  glob: "Searching files",
  grep: "Searching text",
  read_file: "Reading",
  run_diagnostics: "Running diagnostics",
  run_git_commands: "Running git commands",
  run_shell_command: "Running command",
  think: "Thinking",
  unavailable: "Unknown tool",
  write_file: "Writing a file",
};

const TOOL_ICONS: Record<ToolName, LucideIcon | undefined> = {
  choose: HelpCircle,
  edit_file: Pencil,
  file_tree: FolderTree,
  glob: List,
  grep: Search,
  read_file: Eye,
  run_diagnostics: Stethoscope,
  run_git_commands: GitBranch,
  run_shell_command: Terminal,
  think: Brain,
  unavailable: TriangleAlert,
  write_file: FilePlus,
};

export function getToolDisplayName(toolName: ToolName): string {
  return TOOL_DISPLAY_NAMES[toolName] ?? "Unknown tool";
}

export function getToolIcon(toolName: ToolName): LucideIcon {
  return TOOL_ICONS[toolName] ?? HelpCircle;
}

export function getToolStreamingDisplayName(toolName: ToolName): string {
  return TOOL_STREAMING_DISPLAY_NAMES[toolName] ?? "Processing";
}
