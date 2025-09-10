import { z } from "zod";

const SupportedEditorIdSchema = z.enum([
  "cmd",
  "cursor",
  "iterm",
  "powershell",
  "terminal",
  "vscode",
]);

export type SupportedEditorId = z.output<typeof SupportedEditorIdSchema>;

export const OpenAppInTypeSchema = z.union([
  z.literal("show-in-folder"),
  SupportedEditorIdSchema,
]);

export type OpenAppInType = z.output<typeof OpenAppInTypeSchema>;

export const SupportedEditorSchema = z.object({
  available: z.boolean(),
  id: SupportedEditorIdSchema,
  name: z.string(),
});

export type SupportedEditor = z.output<typeof SupportedEditorSchema>;
