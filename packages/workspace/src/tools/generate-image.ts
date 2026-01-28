import { generateImageWithProvider } from "@quests/ai-gateway";
import ms from "ms";
import { err, ok } from "neverthrow";
import { dedent, sift } from "radashi";
import { z } from "zod";

import { absolutePathJoin } from "../lib/absolute-path-join";
import { checkReminder } from "../lib/check-reminder";
import { ensureRelativePath } from "../lib/ensure-relative-path";
import { executeError } from "../lib/execute-error";
import { writeFileWithDir } from "../lib/write-file-with-dir";
import { getWorkspaceServerURL } from "../logic/server/url";
import { RelativePathSchema } from "../schemas/paths";
import { BaseInputSchema, TOOL_EXPLANATION_PARAM_NAME } from "./base";
import { createTool } from "./create-tool";

const INPUT_PARAMS = {
  filePath: "filePath",
  prompt: "prompt",
} as const;

const NO_CAPABLE_PROVIDER_ERROR_CODE = "no-image-generation-provider";

export const GenerateImage = createTool({
  description: dedent`
    Generates an image from a text description using AI and saves it to disk.

    Usage:
    - The ${INPUT_PARAMS.filePath} parameter must be a relative path including the filename. E.g. ./assets/logo.png
    - The file will be saved as a PNG image (1024x1024).
    - This tool requires a registered AI provider that supports image generation (OpenAI, Google, OpenRouter, or Quests).
    - If multiple capable providers are available, the first one found will be used automatically.
  `,
  execute: async ({ appConfig, input, signal }) => {
    const fixedPathResult = ensureRelativePath(input.filePath);
    if (fixedPathResult.isErr()) {
      return err(fixedPathResult.error);
    }
    const fixedPath = fixedPathResult.value;

    const absolutePath = absolutePathJoin(appConfig.appDir, fixedPath);

    try {
      const providerConfigs = appConfig.workspaceConfig.getAIProviderConfigs();

      const result = await generateImageWithProvider({
        configs: providerConfigs,
        prompt: input.prompt,
        workspaceServerURL: getWorkspaceServerURL(),
      });

      if (!result.ok) {
        return err({
          code: NO_CAPABLE_PROVIDER_ERROR_CODE,
          message: dedent`
            No AI provider with image generation capability is registered. 
            Please add one of the following providers: OpenAI, Google (Gemini), OpenRouter, or Quests.
          `,
          type: "execute-error" as const,
        });
      }

      const imageBuffer = Buffer.from(result.value.base64, "base64");
      await writeFileWithDir(absolutePath, imageBuffer, { signal });

      return ok({
        filePath: fixedPath,
        sizeBytes: imageBuffer.length,
      });
    } catch (error) {
      return executeError(
        `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
  inputSchema: BaseInputSchema.extend({
    [INPUT_PARAMS.filePath]: z.string().meta({
      description: `Relative path including filename where the image should be saved (e.g., ./images/output.png). Generate this after ${TOOL_EXPLANATION_PARAM_NAME}.`,
    }),
    [INPUT_PARAMS.prompt]: z.string().meta({
      description: "Detailed description of the image to generate",
    }),
  }),
  name: "generate_image",
  outputSchema: z.object({
    filePath: RelativePathSchema,
    sizeBytes: z.number(),
  }),
  readOnly: false,
  timeoutMs: ms("60 seconds"),
  toModelOutput: ({ output }) => {
    return {
      type: "text",
      value: sift([
        `Successfully generated image and saved to ${output.filePath} (${Math.round(output.sizeBytes / 1024)}KB)`,
        checkReminder(output.filePath),
      ]).join("\n\n"),
    };
  },
});
