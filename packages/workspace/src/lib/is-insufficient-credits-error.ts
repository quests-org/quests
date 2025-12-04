import { type SessionMessage } from "../schemas/session/message";

export function isInsufficientCreditsError(
  message: SessionMessage.Assistant,
): boolean {
  const error = message.metadata.error;
  if (!error) {
    return false;
  }

  return (
    error.kind === "api-call" &&
    message.metadata.aiGatewayModel?.params.provider === "quests" &&
    (error.responseBody?.includes("Insufficient credits") ?? false)
  );
}
