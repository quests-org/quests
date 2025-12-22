import { type AIGatewayModel } from "../schemas/model";

export function getModelFeatures(
  canonicalId: AIGatewayModel.CanonicalId,
): AIGatewayModel.ModelFeatures[] {
  if (canonicalId.startsWith("claude-")) {
    return ["inputText", "outputText", "tools", "inputImage"];
  }

  if (canonicalId.startsWith("gemini-")) {
    return [
      "inputAudio",
      "inputFile",
      "inputVideo",
      "inputImage",
      "inputText",
      "outputText",
      "tools",
    ];
  }

  if (/^gpt-\d+/.test(canonicalId) || canonicalId.startsWith("o-")) {
    return ["inputFile", "inputImage", "inputText", "outputText", "tools"];
  }

  if (canonicalId.startsWith("grok-")) {
    return ["inputText", "outputText", "tools", "inputImage"];
  }

  if (canonicalId.startsWith("llama-4")) {
    return ["inputText", "outputText", "tools", "inputImage"];
  }

  if (canonicalId.startsWith("glm") && canonicalId.endsWith("v")) {
    return ["inputText", "outputText", "tools", "inputImage"];
  }

  // Unknown model
  return ["inputText", "outputText", "tools"];
}
