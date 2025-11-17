import { z } from "zod";

export const ProjectModeSchema = z.enum(["app-builder", "chat", "eval"]);

export type ProjectMode = z.output<typeof ProjectModeSchema>;
