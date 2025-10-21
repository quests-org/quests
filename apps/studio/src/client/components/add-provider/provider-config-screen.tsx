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
import { type AIProviderType } from "@quests/shared";
import { useAtom, useAtomValue } from "jotai";
import { AlertCircle, Lock } from "lucide-react";
import { useMemo } from "react";

import { addProviderDialogAtom } from "../../atoms/add-provider";
import { ProviderPicker } from "../provider-picker";
import { Alert, AlertDescription } from "../ui/alert";
import { ProviderLinks } from "./provider-links";

export function ProviderConfigScreen({
  onSave,
  providers,
  saving,
}: {
  onSave: (skipValidation?: boolean) => Promise<void>;
  providers: { type: AIProviderType }[];
  saving: boolean;
}) {
  const { providerMetadataMap } = useAtomValue(providerMetadataAtom);
  const [state, dispatch] = useAtom(addProviderDialogAtom);

  const providerMetadata = useMemo(() => {
    return state.selectedProviderType
      ? providerMetadataMap.get(state.selectedProviderType)
      : undefined;
  }, [state.selectedProviderType, providerMetadataMap]);

  const requiresAPIKey = providerMetadata?.requiresAPIKey ?? true;
  const isOpenAICompatible = state.selectedProviderType === "openai-compatible";

  const isFormValid =
    state.selectedProviderType !== undefined &&
    (!requiresAPIKey || state.apiKey) &&
    (!isOpenAICompatible || (state.baseURL && state.displayName));

  const handleApiKeyChange = (value: string) => {
    dispatch({ type: "SET_API_KEY", value });
  };

  const handleBaseURLChange = (value: string) => {
    dispatch({ type: "SET_BASE_URL", value });
  };

  const handleDisplayNameChange = (value: string) => {
    dispatch({ type: "SET_DISPLAY_NAME", value });
  };

  const handleProviderSelect = (providerType: AIProviderType | undefined) => {
    if (providerType) {
      dispatch({ providerType, type: "SELECT_PROVIDER" });
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
          Add Provider
        </DialogTitle>
        <DialogDescription>
          {state.selectedProviderType && providerMetadata
            ? providerMetadata.description
            : "Select a provider to add for AI model usage."}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-y-3 py-3">
        <div className="flex flex-col gap-y-1">
          <Label>Provider</Label>
        </div>

        <ProviderPicker
          addedProviderTypes={providers.map((p) => p.type)}
          onSelect={handleProviderSelect}
          selectedProvider={state.selectedProviderType}
        />

        {state.selectedProviderType && providerMetadata && (
          <>
            {isOpenAICompatible && (
              <>
                <div className="flex flex-col gap-y-1">
                  <Label htmlFor="display-name">Name</Label>
                  <div className="text-xs text-muted-foreground">
                    Custom name to identify this provider
                  </div>
                </div>

                <Input
                  autoFocus
                  id="display-name"
                  onChange={(e) => {
                    handleDisplayNameChange(e.target.value);
                  }}
                  placeholder="E.g. My Custom Provider"
                  spellCheck={false}
                  type="text"
                  value={state.displayName}
                />

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
              </>
            )}

            {requiresAPIKey ? (
              <>
                <div className="flex flex-col gap-y-1">
                  <Label htmlFor="api-key">API Key</Label>
                  {!isOpenAICompatible && (
                    <ProviderLinks
                      keyURL={providerMetadata.api.keyURL}
                      name={providerMetadata.name}
                      url={providerMetadata.url}
                    />
                  )}
                </div>

                <Input
                  autoFocus={!isOpenAICompatible}
                  className="font-mono"
                  id="api-key"
                  onChange={(e) => {
                    handleApiKeyChange(e.target.value);
                  }}
                  placeholder={`${providerMetadata.api.keyFormat ?? ""}...xyz123`}
                  spellCheck={false}
                  type="text"
                  value={state.apiKey}
                />

                <Alert>
                  <Lock className="size-4" />
                  <AlertDescription className="text-xs">
                    Your API key is encrypted and stored locally on your
                    computer.
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <ProviderLinks
                name={providerMetadata.name}
                url={providerMetadata.url}
              />
            )}
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
        <Button disabled={saving || !isFormValid} type="submit">
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
