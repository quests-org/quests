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
import { type ClientAIProviderConfig } from "@/shared/schemas/provider";
import { type AIProviderType } from "@quests/shared";
import { useAtom, useAtomValue } from "jotai";
import { AlertCircle, Lock } from "lucide-react";
import { useRef, useState } from "react";

import { addProviderDialogAtom } from "../../atoms/add-provider";
import { ProviderPicker } from "../provider-picker";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Alert, AlertDescription } from "../ui/alert";
import { ProviderLinks } from "./provider-links";

export function ProviderConfigScreen({
  onSave,
  providers,
  saving,
}: {
  onSave: (skipValidation?: boolean) => Promise<void>;
  providers: ClientAIProviderConfig[];
  saving: boolean;
}) {
  const { providerMetadataMap } = useAtomValue(providerMetadataAtom);
  const [state, dispatch] = useAtom(addProviderDialogAtom);
  const displayNameInputRef = useRef<HTMLInputElement>(null);
  const apiKeyInputRef = useRef<HTMLInputElement>(null);
  const [advancedOpen, setAdvancedOpen] = useState<string | undefined>(
    undefined,
  );

  const providerMetadata = state.selectedProviderType
    ? providerMetadataMap.get(state.selectedProviderType)
    : undefined;

  const requiresAPIKey = providerMetadata?.requiresAPIKey ?? true;
  const isOpenAICompatible = state.selectedProviderType === "openai-compatible";

  const isSecondProviderOfSameType = state.selectedProviderType
    ? providers.some((p) => p.type === state.selectedProviderType)
    : false;

  const hasSelectedProvider = state.selectedProviderType !== undefined;
  const hasAPIKey = !requiresAPIKey || Boolean(state.apiKey.trim());
  const hasDisplayName = Boolean(state.displayName.trim());
  const hasValidBaseURL = Boolean(state.baseURL.trim());

  const isFormValid =
    hasSelectedProvider && hasAPIKey && hasDisplayName && hasValidBaseURL;

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
      const selectedProviderMetadata = providerMetadataMap.get(providerType);
      const hasExistingProvider = providers.some(
        (p) => p.type === providerType,
      );

      const shouldSetDefaultDisplayName =
        providerType !== "openai-compatible" && !hasExistingProvider;

      const displayName = shouldSetDefaultDisplayName
        ? (selectedProviderMetadata?.name ?? "")
        : "";

      const baseURL = selectedProviderMetadata?.api.defaultBaseURL ?? "";

      dispatch({
        baseURL,
        displayName,
        providerType,
        type: "SELECT_PROVIDER",
      });

      const providerRequiresAPIKey =
        selectedProviderMetadata?.requiresAPIKey ?? true;
      if (hasExistingProvider && !providerRequiresAPIKey) {
        setAdvancedOpen("advanced");
      } else {
        setAdvancedOpen(undefined);
      }

      setTimeout(() => {
        if (shouldSetDefaultDisplayName) {
          apiKeyInputRef.current?.focus();
        } else {
          displayNameInputRef.current?.focus();
        }
      }, 0);
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
          onSelect={handleProviderSelect}
          selectedProvider={state.selectedProviderType}
        />

        {state.selectedProviderType && providerMetadata && (
          <>
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="display-name">Name</Label>
              <div className="text-xs text-muted-foreground">
                {isSecondProviderOfSameType
                  ? "Custom name to distinguish this provider from others of the same type"
                  : "Custom name to identify this provider"}
              </div>
            </div>

            <Input
              id="display-name"
              onChange={(e) => {
                handleDisplayNameChange(e.target.value);
              }}
              placeholder={`E.g. My ${providerMetadata.name}`}
              ref={displayNameInputRef}
              spellCheck={false}
              type="text"
              value={state.displayName}
            />

            {isOpenAICompatible && (
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
                  className="font-mono"
                  id="api-key"
                  onChange={(e) => {
                    handleApiKeyChange(e.target.value);
                  }}
                  placeholder={`${providerMetadata.api.keyFormat ?? ""}...xyz123`}
                  ref={apiKeyInputRef}
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

            {!isOpenAICompatible && (
              <Accordion
                collapsible
                onValueChange={setAdvancedOpen}
                type="single"
                value={advancedOpen}
              >
                <AccordionItem className="border-b-0" value="advanced">
                  <AccordionTrigger className="py-3 text-muted-foreground font-normal text-xs justify-start gap-1.5">
                    Advanced
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-y-3">
                      <div className="flex flex-col gap-y-1">
                        <Label htmlFor="base-url">Base URL</Label>
                        <div className="text-xs text-muted-foreground">
                          Only change this if you know what you&apos;re doing.{" "}
                          Use the{" "}
                          <span
                            className="cursor-pointer underline underline-offset-2 hover:text-foreground"
                            onClick={() => {
                              handleProviderSelect("openai-compatible");
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleProviderSelect("openai-compatible");
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            OpenAI-compatible provider
                          </span>{" "}
                          if you want to add a custom OpenAI-compatible
                          provider.
                        </div>
                      </div>

                      <Input
                        className="font-mono"
                        id="base-url"
                        onChange={(e) => {
                          handleBaseURLChange(e.target.value);
                        }}
                        placeholder={providerMetadata.api.defaultBaseURL}
                        spellCheck={false}
                        type="text"
                        value={state.baseURL}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </>
        )}

        {state.errorMessage && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription className="flex flex-col gap-2">
              <div>{state.errorMessage}</div>
              {state.validationFailed && state.allowBypass && (
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
