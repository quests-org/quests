import { getProviderDetails } from "@quests/ai-gateway";
import { dedent } from "radashi";

import { getWorkspaceServerURL } from "../logic/server/url";
import { type AppConfig } from "./app-config/types";

export async function buildAIProviderInstructions({
  appConfig,
}: {
  appConfig: AppConfig;
}): Promise<string> {
  const configs = appConfig.workspaceConfig.getAIProviderConfigs();

  if (configs.length === 0) {
    return "";
  }

  const providerDetails = await getProviderDetails({
    captureException: appConfig.workspaceConfig.captureException,
    configs,
    workspaceServerURL: getWorkspaceServerURL(),
  });

  const modelIdLabel = "Suggested model";

  const providerSections = providerDetails
    .map(
      ({
        aiSDKPackage,
        config,
        envVariables,
        metadata,
        recommendedModelId,
      }) => {
        const name =
          metadata.name &&
          config.displayName &&
          metadata.name !== config.displayName
            ? `${metadata.name} (${config.displayName})`
            : metadata.name;

        const envVarNames = Object.keys(envVariables);
        const envVarsText =
          envVarNames.length > 0 ? envVarNames.join(", ") : "none";

        const questsNote =
          config.type === "quests"
            ? " (first-party provider; behaves like OpenRouter and can be substituted for OpenRouter API key for common APIs)"
            : "";

        return dedent`
        ## ${name}${questsNote}
        Environment variables: ${envVarsText}
        ${recommendedModelId ? `${modelIdLabel}: \`${recommendedModelId}\`` : ""}
        AI SDK package: \`${aiSDKPackage}\`
      `.trim();
      },
    )
    .join("\n\n");

  return dedent`
    # AI Providers
    The following AI providers are available:

    ${providerSections}

    ## CRITICAL: Using AI Providers
    You MUST use the "${modelIdLabel}" listed above unless the user explicitly requests a different model.
    - Verify you're using the exact suggested model ID before writing code
    - Do NOT default to familiar models (e.g., gpt-4o-mini, claude-3-5-sonnet-20241022)
    - Suggested models are guaranteed to work; others may have billing/compatibility issues
  `.trim();
}
