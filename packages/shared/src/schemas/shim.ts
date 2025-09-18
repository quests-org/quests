import { z } from "zod";

export const ConsoleLogTypeSchema = z.enum([
  "debug",
  "error",
  "info",
  "log",
  "warn",
]);

export const ShimIFrameOutMessageSchema = z.object({
  type: z.literal("console-log"),
  value: z.object({
    args: z.array(z.unknown()),
    type: ConsoleLogTypeSchema,
  }),
});

export type ConsoleLogType = z.output<typeof ConsoleLogTypeSchema>;
export type ShimIFrameOutMessage = z.output<typeof ShimIFrameOutMessageSchema>;
