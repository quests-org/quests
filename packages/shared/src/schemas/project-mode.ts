import { z } from "zod";

export const ProjectModeSchema = z.enum(["app-builder", "chat"]);

export type ProjectMode = z.output<typeof ProjectModeSchema>;
