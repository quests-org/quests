export interface EditorConfig {
  appName: string;
  id: SupportedEditorId;
  name: string;
}

export type OpenAppInType = "show-in-folder" | SupportedEditorId;

export interface SupportedEditor {
  available: boolean;
  id: SupportedEditorId;
  name: string;
}

export type SupportedEditorId =
  | "cmd"
  | "cursor"
  | "iterm"
  | "powershell"
  | "terminal"
  | "vscode";
