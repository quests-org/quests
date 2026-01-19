import { type SessionMessage } from "@quests/workspace/client";
import { z } from "zod";

const questsErrorResponseSchema = z
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
      error: z.object({
        code: z.string(),
        message: z.string().optional(),
        retryable: z.boolean().optional(),
      }),
    }),
  );

interface QuestsApiError {
  code: QuestsErrorCode;
  message?: string;
  retryable?: boolean;
}

type QuestsErrorCode =
  | "insufficient-credits"
  | "model-not-allowed"
  | "model-not-found"
  | "no-model-requested";

export function parseQuestsApiError(
  message: SessionMessage.Assistant,
): null | QuestsApiError {
  const metadataError = message.metadata.error;
  if (
    !metadataError ||
    metadataError.kind !== "api-call" ||
    message.metadata.aiGatewayModel?.params.provider !== "quests"
  ) {
    return null;
  }

  if (!metadataError.responseBody) {
    return null;
  }

  const result = questsErrorResponseSchema.safeParse(
    metadataError.responseBody,
  );
  if (result.success) {
    return {
      code: result.data.error.code as QuestsErrorCode,
      message: result.data.error.message,
      retryable: result.data.error.retryable,
    };
  }

  if (
    metadataError.responseBody.toLowerCase().includes("insufficient credits")
  ) {
    return {
      code: "insufficient-credits",
      message: "Insufficient credits",
    };
  }

  return null;
}

export function requiresAutoModelRecovery(
  message: SessionMessage.Assistant,
): boolean {
  const error = parseQuestsApiError(message);
  return (
    error?.code === "model-not-allowed" ||
    error?.code === "model-not-found" ||
    error?.code === "no-model-requested"
  );
}
