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
      ({ aiSDKInfo, config, envVariables, metadata, recommendedModelId }) => {
        const name =
          metadata.name &&
          config.displayName &&
          metadata.name !== config.displayName
            ? `${metadata.name} (${config.displayName})`
            : metadata.name;

        const envVarsText = Object.keys(envVariables).join(", ");

        const questsNote =
          config.type === "quests"
            ? " (first-party provider; behaves like OpenRouter and can be substituted for OpenRouter API key for common APIs)"
            : "";

        const importText = "import"; // Required or code will be mistakenly transpiled by Electron Vite
        const usageExample = dedent`
          \`\`\`typescript
          ${importText} { ${aiSDKInfo.exportName} } from "${aiSDKInfo.package}";
          const provider = ${aiSDKInfo.exportName}({ apiKey: process.env.${aiSDKInfo.envVars.apiKey}, baseURL: process.env.${aiSDKInfo.envVars.baseURL} });
          const text = await generateText({
            model: provider("${recommendedModelId}"),
            prompt: "Hello, world!",
          });
          \`\`\`
        `.trim();

        return dedent`
        ## ${name}${questsNote}
        Environment variables: ${envVarsText}
        ${recommendedModelId ? `${modelIdLabel}: \`${recommendedModelId}\`` : ""}
        ${usageExample}
      `.trim();
      },
    )
    .join("\n\n");

  return dedent`
    # AI Providers
    The following AI providers are available:

    ${providerSections}

    ## Using AI Providers
    When writing code that uses AI models:
    - The "${modelIdLabel}" listed above is recommended and guaranteed to work with billing/compatibility
    - You may use other models if the user explicitly requests them
    - Always supply the \`*_BASE_URL\` environment variable for the API client as calls route through the internal proxy and will not work otherwise
    - \`*_API_KEY\` environment variables contain a placeholder key that is swapped at the gateway for the actual provider key
  `.trim();
}
