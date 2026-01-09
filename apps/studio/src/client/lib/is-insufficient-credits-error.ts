import { type SessionMessage } from "@quests/workspace/client";
import { z } from "zod";

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
      error: z.object({
        code: z.string().optional(),
        message: z.string().optional(),
        retryable: z.boolean().optional(),
      }),
    }),
  );

export function isInsufficientCreditsError(
  message: SessionMessage.Assistant,
): boolean {
  const metadataError = message.metadata.error;
  if (
    !metadataError ||
    metadataError.kind !== "api-call" ||
    message.metadata.aiGatewayModel?.params.provider !== "quests"
  ) {
    return false;
  }

  if (!metadataError.responseBody) {
    return false;
  }

  const result = responseBodySchema.safeParse(metadataError.responseBody);
  if (result.success) {
    if (
      result.data.error.message?.toLowerCase().includes("insufficient credits")
    ) {
      return true;
    }
    if (result.data.error.code === "insufficient-credits") {
      return true;
    }
  }

  // Fall back to string matching in the raw response body for response before 2026-01-09
  return metadataError.responseBody
    .toLowerCase()
    .includes("insufficient credits");
}
