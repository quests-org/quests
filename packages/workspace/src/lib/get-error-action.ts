import { z } from "zod";

import { type SessionMessage } from "../schemas/session/message";

const responseBodySchema = z
  .string()
  .transform((jsonString, ctx) => {
    try {
      return JSON.parse(jsonString) as unknown;
    } catch (error: unknown) {
      ctx.addIssue({
        code: "custom",
        message: error instanceof Error ? error.message : "Invalid JSON",
      });
      return z.NEVER;
    }
  })
  .pipe(
    z.object({
      error: z
        .object({
          code: z.string().optional(),
          message: z.string().optional(),
          retryable: z.boolean().optional(),
        })
        .optional(),
    }),
  );

type ErrorAction =
  | { error: Error; type: "error" }
  | { type: "continue" }
  | { type: "retry" }
  | { type: "stop" };

export function getErrorAction(message: SessionMessage.Assistant): ErrorAction {
  const error = message.metadata.error;
  if (!error) {
    return { type: "continue" };
  }

  if (error.kind === "aborted") {
    return { type: "stop" };
  }

  if (error.kind === "unknown") {
    return { error: new Error(error.message), type: "error" };
  }

  if (error.kind === "no-such-tool" || error.kind === "invalid-tool-input") {
    return { type: "retry" };
  }

  if (error.kind === "api-call") {
    // Check for insufficient balance errors, e.g. DeepSeek does this
    if (error.responseBody) {
      const result = responseBodySchema.safeParse(error.responseBody);
      if (
        result.success &&
        result.data.error?.message
          ?.toLowerCase()
          .includes("insufficient balance")
      ) {
        return { type: "stop" };
      }
    }

    // For Quest provider, check if the response explicitly says not retryable
    if (message.metadata.aiGatewayModel?.params.provider === "quests") {
      if (!error.responseBody) {
        return { type: "retry" };
      }

      const result = responseBodySchema.safeParse(error.responseBody);
      if (!result.success) {
        return { type: "retry" };
      }

      const isRetryable = result.data.error?.retryable;

      // Only stop if the response explicitly says not retryable
      if (isRetryable === false) {
        return { type: "stop" };
      }
      return { type: "retry" };
    }

    // For non-Quest providers with API errors, default to retryable
    return { type: "retry" };
  }

  // Unknown error kind, stop to be safe
  return { type: "stop" };
}
