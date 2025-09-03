export function isAnthropic({
  modelId,
  providerId,
}: {
  modelId: string;
  providerId: string;
}): boolean {
  return (
    providerId === "anthropic" ||
    modelId.includes("anthropic") ||
    modelId.includes("claude")
  );
}
