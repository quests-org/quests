import { z } from "zod";

export const ConsoleLogTypeSchema = z.enum([
  "debug",
  "error",
  "info",
  "log",
  "warn",
]);

export const ShimIFrameOutMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("console-log"),
    value: z.object({
      message: z.string(),
      type: ConsoleLogTypeSchema,
    }),
  }),
  z.object({
    type: z.literal("will-reload"),
  }),
  z.object({
    type: z.literal("open-console"),
  }),
]);

export type ConsoleLogType = z.output<typeof ConsoleLogTypeSchema>;
export type ShimIFrameOutMessage = z.output<typeof ShimIFrameOutMessageSchema>;
