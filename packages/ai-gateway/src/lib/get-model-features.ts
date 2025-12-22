import { type AIGatewayModel } from "../schemas/model";

export function getModelFeatures(
  canonicalId: AIGatewayModel.CanonicalId,
): AIGatewayModel.ModelFeatures[] {
  let features: AIGatewayModel.ModelFeatures[] = [];

  if (canonicalId.startsWith("claude-")) {
    features = ["inputText", "outputText", "tools", "inputImage"];
  }

  if (canonicalId.startsWith("gemini-")) {
    features = [
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
    features = ["inputFile", "inputImage", "inputText", "outputText", "tools"];

    if (canonicalId.endsWith("-audio-preview")) {
      // Matches openai/gpt-4o-audio-preview, which is an audio-only model
      features = ["inputAudio"];
    }
  }

  if (canonicalId.startsWith("grok-")) {
    features = ["inputText", "outputText", "tools", "inputImage"];
  }

  if (canonicalId.startsWith("llama-4")) {
    features = ["inputText", "outputText", "tools", "inputImage"];
  }

  if (canonicalId.startsWith("glm") && canonicalId.endsWith("v")) {
    features = ["inputText", "outputText", "tools", "inputImage"];
  }

  return features;
}
