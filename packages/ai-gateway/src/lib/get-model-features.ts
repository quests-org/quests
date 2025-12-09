import { type AIGatewayModel } from "../schemas/model";

export function getModelFeatures(
  canonicalId: AIGatewayModel.CanonicalId,
): AIGatewayModel.ModelFeatures[] {
  const features: AIGatewayModel.ModelFeatures[] = [];

  if (canonicalId.startsWith("claude-")) {
    features.push("inputText", "outputText", "tools", "inputImage");
  }

  if (canonicalId.startsWith("gemini-")) {
    features.push(
      "inputAudio",
      "inputFile",
      "inputVideo",
      "inputImage",
      "inputText",
      "outputText",
      "tools",
    );
  }

  if (/^gpt-\d+/.test(canonicalId) || canonicalId.startsWith("o-")) {
    features.push(
      "inputFile",
      "inputImage",
      "inputText",
      "outputText",
      "tools",
    );

    if (canonicalId.endsWith("-audio-preview")) {
      // For openai/gpt-4o-audio-preview
      features.push("inputAudio");
    }
  }

  return features;
}
