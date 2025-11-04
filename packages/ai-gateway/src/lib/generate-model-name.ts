import { capitalize } from "radashi";

import { type AIGatewayModel } from "../client";

export function generateModelName(modelId: AIGatewayModel.CanonicalId): string {
  const replacements: Record<string, string> = {
    // cspell:disable
    chatgpt: "ChatGPT",
    codellama: "CodeLLaMa",
    deephermes: "DeepHermes",
    deepseek: "DeepSeek",
    glm: "GLM",
    gpt: "GPT",
    longcat: "LongCat",
    minimax: "MiniMax",
    oss: "OSS",
    qwq: "QwQ",
    vl: "VL",
    xl: "XL",
    // cspell:enable
  };

  const parts = modelId.split(/[-_/:]/);

  const titleCased = parts.map((part) => {
    const lower = part.toLowerCase();

    if (replacements[lower]) {
      return replacements[lower];
    }

    if (/^\d+[a-z]*$/i.test(part)) {
      const match = /^(\d+)([a-z]*)$/i.exec(part);
      if (match) {
        const num = match[1];
        const suffix = match[2] ?? "";
        const suffixCased = suffix.toLowerCase() === "b" ? "B" : suffix;
        return (num ?? "") + suffixCased;
      }
      return part;
    }

    if (/^[a-z]+\d+[a-z]*$/i.test(part)) {
      const match = /^([a-z]+)(\d+)([a-z]*)$/i.exec(part);
      if (match?.[1] && match[2]) {
        const prefix = match[1];
        const num = match[2];
        const suffix = match[3] ?? "";
        const prefixCased =
          replacements[prefix.toLowerCase()] ?? capitalize(prefix);
        const suffixCased = suffix
          ? (replacements[suffix.toLowerCase()] ?? suffix.toUpperCase())
          : "";
        return prefixCased + num + suffixCased;
      }
    }

    return capitalize(part);
  });

  return titleCased.join(" ");
}
