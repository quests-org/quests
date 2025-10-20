import { type SharedV2ProviderOptions } from "@ai-sdk/provider";
import {
  type AIProviderType,
  type CaptureExceptionFunction,
  type WorkspaceServerURL,
} from "@quests/shared";
import { type LanguageModel } from "ai";
import { type AsyncResult } from "typescript-result";

import { type TypedError } from "../lib/errors";
import { internalAPIKey } from "../lib/key-for-provider";
import { PROVIDER_API_PATH } from "../lib/provider-paths";
import { type AIGatewayModel } from "../schemas/model";
import { type AIGatewayProviderConfig } from "../schemas/provider-config";
import { type ProviderMetadata } from "../schemas/provider-metadata";

export type ProviderAdapter = ReturnType<
  ReturnType<typeof setupProviderAdapter>["create"]
>;

type AdapterFeatures = "openai/chat-completions";

type OmittedKeys = "metadata" | "providerType";

type OptionalKeys = "buildURL";

interface SetupProviderAdapter {
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
  fetchCredits?: (config: AIGatewayProviderConfig.Type) => AsyncResult<
    {
      total_credits: number;
      total_usage: number;
    },
    TypedError.Fetch
  >;
  fetchModels: (
    config: AIGatewayProviderConfig.Type,
    { captureException }: { captureException: CaptureExceptionFunction },
  ) => AsyncResult<AIGatewayModel.Type[], TypedError.Fetch | TypedError.Parse>;
  getEnv: (workspaceServerURL: WorkspaceServerURL) => Record<string, string>;
  metadata: ProviderMetadata;
  providerType: AIProviderType;
  setAuthHeaders: (headers: Headers, apiKey: string) => void;
  verifyAPIKey: (
    config: Omit<AIGatewayProviderConfig.Type, "cacheIdentifier" | "id">,
  ) => AsyncResult<boolean, TypedError.VerificationFailed>;
}

export function setupProviderAdapter<
  TProviderType extends AIProviderType,
>(options: {
  metadata: ProviderMetadata;
  providerType: TProviderType;
}): {
  create: (
    createAdapter: (options: {
      buildURL: (options: { baseURL?: string; path: string }) => string;
      metadata: ProviderMetadata;
      providerType: TProviderType;
    }) => Omit<SetupProviderAdapter, OmittedKeys | OptionalKeys> &
      Partial<Pick<SetupProviderAdapter, OptionalKeys>>,
  ) => SetupProviderAdapter;
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
        return `${baseURL ?? options.metadata.api.defaultBaseURL}${path}`;
      };
      const { features, getEnv, ...rest } = createAdapter({
        buildURL,
        metadata: options.metadata,
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
        metadata: options.metadata,
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
