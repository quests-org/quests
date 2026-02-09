import { type ToolName } from "@quests/workspace/client";
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
  think: "Thought",
  unavailable: "Unknown tool",
  web_fetch: "Fetched URL",
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
  think: "Thinking",
  unavailable: "Unknown tool",
  web_fetch: "Fetching URL",
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
  think: TOOL_STREAMING_DISPLAY_NAMES.think,
  unavailable: TOOL_STREAMING_DISPLAY_NAMES.unavailable,
  web_fetch: "Fetching",
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
  think: "Failed to think",
  unavailable: "Unknown tool",
  web_fetch: "Failed to fetch URL",
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
  think: Brain,
  unavailable: TriangleAlert,
  web_fetch: Globe,
  web_search: Globe,
  write_file: FilePlus,
};

export function getToolFailedLabel(toolName: ToolName): string {
  return TOOL_FAILED_DISPLAY_NAMES[toolName] ?? "Tool failed";
}

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
