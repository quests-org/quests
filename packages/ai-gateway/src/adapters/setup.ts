import { type SharedV2ProviderOptions } from "@ai-sdk/provider";
import {
  type CaptureExceptionFunction,
  type WorkspaceServerURL,
} from "@quests/shared";
import { type LanguageModel } from "ai";
import { type AsyncResult } from "typescript-result";

import { type TypedError } from "../lib/errors";
import { internalAPIKey } from "../lib/key-for-provider";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { type AIGatewayModel } from "../schemas/model";
import { type AIGatewayProvider } from "../schemas/provider";

export type ProviderAdapter = ReturnType<
  ReturnType<typeof setupProviderAdapter>["create"]
>;

type AdapterFeatures = "openai/chat-completions";

type OmittedKeys = "knownModelIds" | "modelTags" | "providerType";

type OptionalKeys = "buildURL";

interface SetupProviderAdapter<
  KnownModelIds extends readonly string[] = readonly string[],
> {
  aiSDKModel: (
    model: AIGatewayModel.Type,
    provider: {
      cacheIdentifier: string;
      workspaceServerURL: WorkspaceServerURL;
    },
    // Only allowing real models and not strings to avoid type narrowing later
  ) => Exclude<LanguageModel, string>;
  aiSDKProviderOptions?: (
    model: LanguageModel,
  ) => SharedV2ProviderOptions | undefined;
  buildURL: (options: { baseURL?: string; path: string }) => string;
  features: AdapterFeatures[];
  fetchCredits?: (provider: AIGatewayProvider.Type) => AsyncResult<
    {
      total_credits: number;
      total_usage: number;
    },
    TypedError.Fetch
  >;
  fetchModels: (
    provider: AIGatewayProvider.Type,
    { captureException }: { captureException: CaptureExceptionFunction },
  ) => AsyncResult<AIGatewayModel.Type[], TypedError.Fetch | TypedError.Parse>;
  getEnv: (workspaceServerURL: WorkspaceServerURL) => Record<string, string>;
  knownModelIds: KnownModelIds;
  modelTags: Record<KnownModelIds[number], AIGatewayModel.ModelTag[]>;
  providerType: AIGatewayProvider.Type["type"];
  setAuthHeaders: (headers: Headers, apiKey: string) => void;
  verifyAPIKey: ({
    apiKey,
    baseURL,
  }: {
    apiKey: string;
    baseURL?: string;
  }) => AsyncResult<boolean, TypedError.VerificationFailed>;
}

export function setupProviderAdapter<
  TProviderType extends AIGatewayProvider.Type["type"],
  const KnownModelIds extends readonly string[],
>(options: {
  defaultBaseURL: string;
  knownModelIds: KnownModelIds;
  modelTags: Partial<Record<KnownModelIds[number], AIGatewayModel.ModelTag[]>>;
  providerType: TProviderType;
}): {
  create: (
    createAdapter: (options: {
      buildURL: (options: { baseURL?: string; path: string }) => string;
      getModelTags: (
        modelId: AIGatewayModel.ProviderId,
      ) => AIGatewayModel.ModelTag[];
      providerType: TProviderType;
    }) => Omit<
      SetupProviderAdapter<KnownModelIds>,
      OmittedKeys | OptionalKeys
    > &
      Partial<Pick<SetupProviderAdapter<KnownModelIds>, OptionalKeys>>,
  ) => Omit<SetupProviderAdapter<KnownModelIds>, "modelTags">;
} {
  return {
    create: (createAdapter) => {
      const buildURL = ({
        baseURL,
        path,
      }: {
        baseURL?: string;
        path: string;
      }) => {
        return `${baseURL ?? options.defaultBaseURL}${path}`;
      };
      const { features, getEnv, ...rest } = createAdapter({
        buildURL,
        getModelTags: (modelId: string) =>
          options.modelTags[modelId as KnownModelIds[number]] ?? [],
        providerType: options.providerType,
      });
      return {
        ...rest,
        buildURL: rest.buildURL ?? buildURL,
        features,
        getEnv: (workspaceServerURL) => ({
          ...(features.includes("openai/chat-completions") &&
            getOpenAICompatibleEnv(workspaceServerURL)),
          ...getEnv(workspaceServerURL),
        }),
        knownModelIds: options.knownModelIds,
        modelTags: options.modelTags,
        providerType: options.providerType,
      };
    },
  };
}

function getOpenAICompatibleEnv(baseURL: string): Record<string, string> {
  return {
    OPENAI_API_KEY: internalAPIKey(),
    OPENAI_BASE_URL: `${baseURL}${PROVIDER_API_PATH.openai}`,
  };
}
