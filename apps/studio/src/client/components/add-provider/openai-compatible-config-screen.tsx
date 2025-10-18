import { providerMetadataAtom } from "@/client/atoms/provider-metadata";
import { Button } from "@/client/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { useAtom, useAtomValue } from "jotai";
import { AlertCircle, Lock, TriangleAlert } from "lucide-react";
import { useMemo } from "react";

import { addProviderDialogAtom } from "../../atoms/add-provider";
import { OPENAI_COMPATIBLE_PROVIDERS } from "../../data/openai-compatible-providers";
import { fixURL } from "../../lib/fix-url";
import { AIProviderIcon } from "../ai-provider-icon";
import { OpenAICompatibleProviderPicker } from "../openai-compatible-provider-picker";
import { Alert, AlertDescription } from "../ui/alert";
import { ProviderLinks } from "./provider-links";

interface OpenAICompatibleConfigScreenProps {
  onSave: (skipValidation?: boolean) => Promise<void>;
  saving: boolean;
}

export function OpenAICompatibleConfigScreen({
  onSave,
  saving,
}: OpenAICompatibleConfigScreenProps) {
  const { providerMetadataMap } = useAtomValue(providerMetadataAtom);
  const [state, dispatch] = useAtom(addProviderDialogAtom);

  const providerMetadata = useMemo(() => {
    return providerMetadataMap.get("openai-compatible");
  }, [providerMetadataMap]);

  const hasOpenAICompatibleProvider =
    state.selectedOpenAICompatibleProvider !== undefined;

  const requiresAPIKey = hasOpenAICompatibleProvider
    ? (state.selectedOpenAICompatibleProvider?.requiresAPIKey ?? true)
    : true;

  const matchingBuiltInProvider = useMemo(() => {
    if (!state.baseURL) {
      return null;
    }

    const normalizedBaseURL = fixURL(state.baseURL);
    if (!normalizedBaseURL) {
      return null;
    }

    for (const [type, metadata] of providerMetadataMap.entries()) {
      if (type === "openai-compatible") {
        continue;
      }
      const normalizedDefaultURL = fixURL(metadata.api.defaultBaseURL);
      if (normalizedBaseURL.startsWith(normalizedDefaultURL)) {
        return metadata;
      }
    }

    return null;
  }, [state.baseURL, providerMetadataMap]);

  const isFormValid =
    (state.selectedOpenAICompatibleProvider !== undefined ||
      state.isCustomProvider) &&
    state.baseURL &&
    (!requiresAPIKey || state.apiKey) &&
    (!state.isCustomProvider || state.displayName.trim());

  const handleBack = () => {
    dispatch({ type: "BACK_TO_SELECTION" });
  };

  const handleApiKeyChange = (value: string) => {
    dispatch({ type: "SET_API_KEY", value });
  };

  const handleBaseURLChange = (value: string) => {
    dispatch({ type: "SET_BASE_URL", value });
  };

  const handleDisplayNameChange = (value: string) => {
    dispatch({ type: "SET_DISPLAY_NAME", value });
  };

  const handleProviderSelect = (providerName: string | undefined) => {
    if (providerName === undefined) {
      dispatch({
        provider: undefined,
        type: "SELECT_OPENAI_COMPATIBLE_PROVIDER",
      });
    } else if (providerName === "custom") {
      dispatch({ type: "SET_CUSTOM_PROVIDER" });
    } else {
      const foundProvider = OPENAI_COMPATIBLE_PROVIDERS.find(
        (p) => p.name === providerName,
      );
      if (foundProvider) {
        dispatch({
          provider: foundProvider,
          type: "SELECT_OPENAI_COMPATIBLE_PROVIDER",
        });
      }
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onSave();
      }}
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AIProviderIcon
            subType={
              hasOpenAICompatibleProvider
                ? state.selectedOpenAICompatibleProvider?.subType
                : undefined
            }
            type="openai-compatible"
          />
          {providerMetadata?.name ?? "OpenAI-Compatible Provider"}
        </DialogTitle>
        <DialogDescription>
          {providerMetadata?.description ??
            "Configure your OpenAI-compatible provider settings."}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-y-3 py-3">
        <div className="flex flex-col gap-y-1">
          <Label>Provider</Label>
        </div>

        <OpenAICompatibleProviderPicker
          onSelect={handleProviderSelect}
          selectedProvider={
            hasOpenAICompatibleProvider
              ? state.selectedOpenAICompatibleProvider?.name
              : state.isCustomProvider
                ? "custom"
                : undefined
          }
        />

        {hasOpenAICompatibleProvider &&
          state.selectedOpenAICompatibleProvider && (
            <ProviderLinks
              keyURL={state.selectedOpenAICompatibleProvider.api.keyURL}
              name={state.selectedOpenAICompatibleProvider.name}
              url={state.selectedOpenAICompatibleProvider.url}
            />
          )}

        {state.isCustomProvider && (
          <>
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="display-name">Name</Label>
              <div className="text-xs text-muted-foreground">
                Custom name to identify this provider
              </div>
            </div>

            <Input
              id="display-name"
              onChange={(e) => {
                handleDisplayNameChange(e.target.value);
              }}
              placeholder="E.g. My Custom Provider"
              spellCheck={false}
              type="text"
              value={state.displayName}
            />
          </>
        )}

        {(state.selectedOpenAICompatibleProvider !== undefined ||
          state.isCustomProvider) && (
          <>
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="base-url">Base URL</Label>
              <div className="text-xs text-muted-foreground">
                The base URL of your OpenAI-compatible endpoint
              </div>
            </div>

            <Input
              className="font-mono"
              id="base-url"
              onChange={(e) => {
                handleBaseURLChange(e.target.value);
              }}
              placeholder="E.g. https://api.example.com/v1"
              spellCheck={false}
              type="text"
              value={state.baseURL}
            />

            {matchingBuiltInProvider && (
              <Alert variant="warning">
                <TriangleAlert className="size-4" />
                <AlertDescription>
                  This URL matches the {matchingBuiltInProvider.name} provider.
                  Use the built-in provider for better performance.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {(state.selectedOpenAICompatibleProvider !== undefined ||
          state.isCustomProvider) &&
          requiresAPIKey && (
            <>
              <div className="flex flex-col gap-y-1">
                <Label htmlFor="api-key">API Key</Label>
                {hasOpenAICompatibleProvider &&
                  state.selectedOpenAICompatibleProvider?.api.keyURL && (
                    <ProviderLinks
                      keyURL={state.selectedOpenAICompatibleProvider.api.keyURL}
                      name={state.selectedOpenAICompatibleProvider.name}
                      url={state.selectedOpenAICompatibleProvider.url}
                    />
                  )}
              </div>

              <Input
                className="font-mono"
                id="api-key"
                onChange={(e) => {
                  handleApiKeyChange(e.target.value);
                }}
                placeholder={`${hasOpenAICompatibleProvider ? (state.selectedOpenAICompatibleProvider?.api.keyFormat ?? "") : ""}...xyz123`}
                spellCheck={false}
                type="text"
                value={state.apiKey}
              />

              <Alert>
                <Lock className="size-4" />
                <AlertDescription className="text-xs">
                  Your API key is encrypted and stored locally on your computer.
                </AlertDescription>
              </Alert>
            </>
          )}

        {state.errorMessage && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription className="flex flex-col gap-2">
              <div>{state.errorMessage}</div>
              {state.validationFailed && (
                <Button
                  className="w-fit"
                  onClick={() => onSave(true)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Add anyway
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
      <DialogFooter className="flex gap-2">
        <Button onClick={handleBack} type="button" variant="secondary">
          Back
        </Button>
        <Button disabled={saving || !isFormValid} type="submit">
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
