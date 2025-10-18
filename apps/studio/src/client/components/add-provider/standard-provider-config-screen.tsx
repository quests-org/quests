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
import { AlertCircle, ExternalLink, Lock } from "lucide-react";
import { useMemo } from "react";

import { addProviderDialogAtom } from "../../atoms/add-provider";
import { AIProviderIcon } from "../ai-provider-icon";
import { Alert, AlertDescription } from "../ui/alert";
import { ProviderLinks } from "./provider-links";

interface StandardProviderConfigScreenProps {
  onSave: (skipValidation?: boolean) => Promise<void>;
  providerType: AIProviderType;
  saving: boolean;
}

export function StandardProviderConfigScreen({
  onSave,
  providerType,
  saving,
}: StandardProviderConfigScreenProps) {
  const { providerMetadataMap } = useAtomValue(providerMetadataAtom);
  const [state, dispatch] = useAtom(addProviderDialogAtom);

  const providerMetadata = useMemo(() => {
    return providerMetadataMap.get(providerType);
  }, [providerType, providerMetadataMap]);

  const requiresAPIKey = providerMetadata?.requiresAPIKey ?? false;

  const handleBack = () => {
    dispatch({ type: "BACK_TO_SELECTION" });
  };

  const handleApiKeyChange = (value: string) => {
    dispatch({ type: "SET_API_KEY", value });
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
          <AIProviderIcon type={providerType} />
          {providerMetadata?.name ?? "Provider"}
        </DialogTitle>
        <DialogDescription>
          {providerMetadata?.description ?? "Configure your provider settings."}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-y-3 py-3">
        {requiresAPIKey && providerMetadata && (
          <>
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="api-key">API Key</Label>
              <ProviderLinks
                keyURL={providerMetadata.api.keyURL}
                name={providerMetadata.name}
                url={providerMetadata.url}
              />
            </div>

            <Input
              autoFocus
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
                Your API key is encrypted and stored locally on your computer.
              </AlertDescription>
            </Alert>
          </>
        )}
        {!requiresAPIKey && providerMetadata && (
          <a
            className="inline-flex items-center gap-x-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
            href={providerMetadata.url}
            rel="noopener noreferrer"
            target="_blank"
          >
            Learn more about {providerMetadata.name}
            <ExternalLink className="h-3 w-3" />
          </a>
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
        <Button
          disabled={saving || (requiresAPIKey && !state.apiKey)}
          type="submit"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}
