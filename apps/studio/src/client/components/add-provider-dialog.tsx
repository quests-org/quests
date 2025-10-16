import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { cn } from "@/client/lib/utils";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { type ClientAIProvider } from "@/shared/schemas/provider";
import { isDefinedError } from "@orpc/client";
import {
  type AIGatewayProvider,
  RECOMMENDED_TAG,
} from "@quests/ai-gateway/client";
import { useMutation } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import {
  AlertCircle,
  Award,
  ChefHat,
  ExternalLink,
  Lock,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { providerMetadataAtom } from "../atoms/provider-metadata";
import { selectedModelURIAtom } from "../atoms/selected-models";
import { OPENAI_COMPATIBLE_PROVIDERS } from "../data/openai-compatible-providers";
import { AIProviderIcon } from "./ai-provider-icon";
import { OpenAICompatibleProviderPicker } from "./openai-compatible-provider-picker";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";

interface AddProviderDialogProps {
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  open: boolean;
  providers?: ClientAIProvider[];
}

type DialogStage = "configuration" | "provider-selection";

export function AddProviderDialog({
  onOpenChange,
  onSuccess,
  open,
  providers = [],
}: AddProviderDialogProps) {
  const [selectedModelURI, setSelectedModelURI] = useAtom(selectedModelURIAtom);
  const [stage, setStage] = useState<DialogStage>("provider-selection");
  const [selectedProviderType, setSelectedProviderType] = useState<
    AIGatewayProvider.Type["type"] | undefined
  >(undefined);
  const [selectedPresetProvider, setSelectedPresetProvider] = useState<
    string | undefined
  >(undefined);
  const [apiKey, setAPIKey] = useState("");
  const [baseURL, setBaseURL] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState<null | string>(null);
  const [validationFailed, setValidationFailed] = useState(false);

  const { providerMetadataMap, sortedProviderMetadata } =
    useAtomValue(providerMetadataAtom);

  const providerMetadata = useMemo(() => {
    if (!selectedProviderType) {
      return null;
    }
    return providerMetadataMap.get(selectedProviderType);
  }, [selectedProviderType, providerMetadataMap]);

  const matchingBuiltInProvider = useMemo(() => {
    if (selectedProviderType !== "openai-compatible" || !baseURL) {
      return null;
    }

    const normalizedBaseURL = normalizeURL(baseURL);
    if (!normalizedBaseURL) {
      return null;
    }

    for (const [type, metadata] of providerMetadataMap.entries()) {
      if (type === "openai-compatible") {
        continue;
      }
      const normalizedDefaultURL = normalizeURL(metadata.api.defaultBaseURL);
      if (normalizedBaseURL.startsWith(normalizedDefaultURL)) {
        return metadata;
      }
    }

    return null;
  }, [baseURL, selectedProviderType, providerMetadataMap]);

  const createMutation = useMutation(
    rpcClient.provider.create.mutationOptions(),
  );

  useEffect(() => {
    if (open) {
      setAPIKey("");
      setBaseURL("");
      setDisplayName("");
      setErrorMessage(null);
      setValidationFailed(false);
      setSelectedProviderType(undefined);
      setSelectedPresetProvider(undefined);
      setStage("provider-selection");
    }
  }, [open]);

  const handleProviderSelect = (type: AIGatewayProvider.Type["type"]) => {
    setSelectedProviderType(type);
    setErrorMessage(null);
    setValidationFailed(false);
    setStage("configuration");
  };

  const handleBackToSelection = () => {
    setStage("provider-selection");
    setSelectedProviderType(undefined);
    setSelectedPresetProvider(undefined);
    setErrorMessage(null);
    setValidationFailed(false);
  };

  const handleApiKeyChange = (value: string) => {
    setAPIKey(value);
    setErrorMessage(null);
    setValidationFailed(false);
  };

  const handlePresetProviderSelect = (providerName: string | undefined) => {
    if (providerName === undefined) {
      setSelectedPresetProvider(undefined);
      setBaseURL("");
      setDisplayName("");
    } else if (providerName === "custom") {
      setSelectedPresetProvider("custom");
      setBaseURL("");
      setDisplayName("");
    } else {
      const provider = OPENAI_COMPATIBLE_PROVIDERS.find(
        (p) => p.name === providerName,
      );
      if (provider) {
        setSelectedPresetProvider(providerName);
        setBaseURL(provider.api.defaultBaseURL);
        setDisplayName("");
      }
    }
    setErrorMessage(null);
    setValidationFailed(false);
  };

  const selectedPresetProviderData = useMemo(() => {
    if (!selectedPresetProvider || selectedPresetProvider === "custom") {
      return null;
    }
    return (
      OPENAI_COMPATIBLE_PROVIDERS.find(
        (p) => p.name === selectedPresetProvider,
      ) ?? null
    );
  }, [selectedPresetProvider]);

  const handleSave = async (skipValidation = false) => {
    if (
      !selectedProviderType ||
      (providerMetadata?.requiresAPIKey && !apiKey) ||
      (selectedProviderType === "openai-compatible" && !baseURL) ||
      (selectedProviderType === "openai-compatible" &&
        selectedPresetProvider === "custom" &&
        !displayName.trim())
    ) {
      return;
    }

    const normalizedBaseURL =
      selectedProviderType === "openai-compatible"
        ? normalizeURL(baseURL)
        : undefined;

    if (normalizedBaseURL && normalizedBaseURL !== baseURL) {
      setBaseURL(normalizedBaseURL);
    }

    const finalDisplayName =
      selectedProviderType === "openai-compatible" &&
      selectedPresetProvider &&
      selectedPresetProvider !== "custom"
        ? selectedPresetProviderData?.name
        : displayName.trim() || undefined;

    try {
      await createMutation.mutateAsync(
        {
          apiKey: providerMetadata?.requiresAPIKey ? apiKey : "NOT_NEEDED",
          baseURL: normalizedBaseURL,
          displayName: finalDisplayName,
          skipValidation,
          type: selectedProviderType,
        },
        {
          onError: (error) => {
            if (isDefinedError(error)) {
              setErrorMessage(error.message);
              setValidationFailed(true);
            } else {
              setErrorMessage("Failed to validate provider");
              setValidationFailed(true);
            }
          },
        },
      );
      if (providers.length === 0 || !selectedModelURI) {
        const { models } = await vanillaRpcClient.gateway.models.list();
        const defaultModel = models.find((model) =>
          model.tags.includes("default"),
        );
        if (defaultModel) {
          setSelectedModelURI(defaultModel.uri);
        }
      }
      onSuccess();
    } catch {
      // Handled in onError, but caught here to avoid uncaught promise error
    }
  };

  const renderProviderSelection = () => {
    const standardProviders = sortedProviderMetadata.filter(
      (p) => p.type !== "openai-compatible",
    );
    const openaiCompatible = sortedProviderMetadata.find(
      (p) => p.type === "openai-compatible",
    );

    return (
      <>
        <DialogHeader>
          <DialogTitle>Add Provider</DialogTitle>
          <DialogDescription>
            Choose a provider type to add a new AI provider.
          </DialogDescription>
        </DialogHeader>
        <div className="py-3">
          {providers.length === sortedProviderMetadata.length && (
            <Alert className="mb-3">
              <ChefHat className="size-4 animate-bounce" />
              <AlertDescription>
                Wow, you added all of the providers. It&apos;s time to get
                cooking.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-2.5">
            {standardProviders.map((providerInfo) => {
              const isAlreadyAdded = providers.some(
                (p) => p.type === providerInfo.type,
              );
              return (
                <button
                  className={cn(
                    "px-2.5 py-2 rounded-lg border text-left transition-colors flex flex-col gap-1.5 min-h-24",
                    isAlreadyAdded
                      ? "border-muted bg-muted/50 cursor-not-allowed opacity-60"
                      : "border-border hover:border-ring hover:bg-accent cursor-pointer",
                  )}
                  disabled={isAlreadyAdded}
                  key={providerInfo.type}
                  onClick={() => {
                    if (!isAlreadyAdded) {
                      handleProviderSelect(providerInfo.type);
                    }
                  }}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <AIProviderIcon
                      className="opacity-80 size-4.5"
                      type={providerInfo.type}
                    />
                    <div className="font-medium">{providerInfo.name}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {providerInfo.description}
                  </div>
                  {providerInfo.tags.length > 0 && !isAlreadyAdded && (
                    <div className="flex flex-wrap gap-2 mt-auto">
                      {providerInfo.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={
                            tag === RECOMMENDED_TAG
                              ? "brand-outline"
                              : "outline"
                          }
                        >
                          {tag === RECOMMENDED_TAG && (
                            <Award className="size-3" />
                          )}
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {isAlreadyAdded && (
                    <div className="text-xs text-muted-foreground">
                      Already added
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {openaiCompatible && (
            <>
              <div className="mt-3" />
              <button
                className={cn(
                  "w-full px-2.5 py-2 rounded-lg border text-left transition-colors flex flex-col gap-1.5",
                  providers.some((p) => p.type === "openai-compatible")
                    ? "border-muted bg-muted/50 cursor-not-allowed opacity-60"
                    : "border-border hover:border-ring hover:bg-accent cursor-pointer",
                )}
                disabled={providers.some((p) => p.type === "openai-compatible")}
                onClick={() => {
                  if (!providers.some((p) => p.type === "openai-compatible")) {
                    handleProviderSelect("openai-compatible");
                  }
                }}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <AIProviderIcon
                    className="opacity-80 size-4.5"
                    type="openai-compatible"
                  />
                  <div className="font-medium">{openaiCompatible.name}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {openaiCompatible.description}
                </div>
                {providers.some((p) => p.type === "openai-compatible") && (
                  <div className="text-xs text-muted-foreground">
                    Already added
                  </div>
                )}
              </button>
            </>
          )}
        </div>
      </>
    );
  };

  const renderConfiguration = () => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleSave();
      }}
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {selectedProviderType && (
            <AIProviderIcon type={selectedProviderType} />
          )}
          {providerMetadata?.name ?? "Provider"}
        </DialogTitle>
        <DialogDescription>
          {providerMetadata?.description ?? "Configure your provider settings."}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-y-3 py-3">
        {selectedProviderType === "openai-compatible" && (
          <>
            <div className="flex flex-col gap-y-1">
              <Label>Provider</Label>
            </div>

            <OpenAICompatibleProviderPicker
              onSelect={handlePresetProviderSelect}
              selectedProvider={selectedPresetProvider}
            />

            {selectedPresetProviderData && (
              <ProviderLinks
                keyURL={selectedPresetProviderData.api.keyURL}
                name={selectedPresetProviderData.name}
                url={selectedPresetProviderData.url}
              />
            )}

            {selectedPresetProvider === "custom" && (
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
                    setDisplayName(e.target.value);
                  }}
                  placeholder="E.g. My Custom Provider"
                  spellCheck={false}
                  type="text"
                  value={displayName}
                />
              </>
            )}
          </>
        )}

        {selectedProviderType === "openai-compatible" &&
          selectedPresetProvider !== undefined && (
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
                  setBaseURL(e.target.value);
                  setErrorMessage(null);
                  setValidationFailed(false);
                }}
                placeholder="E.g. https://api.example.com/v1"
                spellCheck={false}
                type="text"
                value={baseURL}
              />

              {matchingBuiltInProvider && (
                <Alert variant="warning">
                  <TriangleAlert className="size-4" />
                  <AlertDescription>
                    This URL matches the {matchingBuiltInProvider.name}{" "}
                    provider. Use the built-in provider for better performance.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

        {selectedProviderType &&
          providerMetadata?.requiresAPIKey &&
          (selectedProviderType !== "openai-compatible" ||
            selectedPresetProvider !== undefined) && (
            <>
              <div className="flex flex-col gap-y-1">
                <Label htmlFor="api-key">API Key</Label>
                {selectedProviderType !== "openai-compatible" && (
                  <ProviderLinks
                    keyURL={providerMetadata.api.keyURL}
                    name={providerMetadata.name}
                    url={providerMetadata.url}
                  />
                )}
              </div>

              <Input
                autoFocus={selectedProviderType !== "openai-compatible"}
                className="font-mono"
                id="api-key"
                onChange={(e) => {
                  handleApiKeyChange(e.target.value);
                }}
                placeholder={`${selectedPresetProviderData?.api.keyFormat ?? providerMetadata.api.keyFormat ?? ""}...xyz123`}
                spellCheck={false}
                type="text"
                value={apiKey}
              />

              <Alert>
                <Lock className="size-4" />
                <AlertDescription className="text-xs">
                  Your API key is encrypted and stored locally on your computer.
                </AlertDescription>
              </Alert>
            </>
          )}
        {selectedProviderType &&
          !providerMetadata?.requiresAPIKey &&
          providerMetadata &&
          selectedProviderType !== "openai-compatible" && (
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
        {selectedProviderType === "openai-compatible" &&
          !providerMetadata?.requiresAPIKey &&
          selectedPresetProviderData &&
          selectedPresetProvider !== undefined && (
            <a
              className="inline-flex items-center gap-x-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
              href={selectedPresetProviderData.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              Learn more about {selectedPresetProviderData.name}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription className="flex flex-col gap-2">
              <div>{errorMessage}</div>
              {validationFailed && (
                <Button
                  className="w-fit"
                  onClick={() => handleSave(true)}
                  size="sm"
                  type="button" // Required or this will submit the form
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
        <Button
          onClick={handleBackToSelection}
          type="button"
          variant="secondary"
        >
          Back
        </Button>
        <Button
          disabled={
            createMutation.isPending ||
            !selectedProviderType ||
            (providerMetadata?.requiresAPIKey && !apiKey) ||
            (selectedProviderType === "openai-compatible" && !baseURL) ||
            (selectedProviderType === "openai-compatible" &&
              selectedPresetProvider === "custom" &&
              !displayName.trim())
          }
          type="submit"
        >
          {createMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={cn(
          "transition-none",
          stage === "configuration" ? "sm:max-w-lg" : "sm:max-w-xl",
        )}
      >
        {stage === "provider-selection" && renderProviderSelection()}
        {stage === "configuration" && renderConfiguration()}
      </DialogContent>
    </Dialog>
  );
}

function normalizeURL(url: string): string {
  let normalized = url.trim();
  if (!normalized) {
    return normalized;
  }

  normalized = normalized.replaceAll("\\", "/");

  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`;
  }

  normalized = normalized.replaceAll(/([^:]\/)\/+/g, "$1");

  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

function ProviderLinks({
  keyURL,
  name,
  url,
}: {
  keyURL?: string;
  name: string;
  url: string;
}) {
  return (
    <div className="flex items-center gap-x-1 text-xs text-muted-foreground">
      {keyURL && (
        <>
          <span>
            Get your {name}{" "}
            <a
              className="inline-flex items-center gap-x-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
              href={keyURL}
              rel="noopener noreferrer"
              target="_blank"
            >
              API key
              <ExternalLink className="h-3 w-3" />
            </a>
          </span>
          <span>or</span>
        </>
      )}
      <span>
        <a
          className="inline-flex items-center gap-x-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
          href={url}
          rel="noopener noreferrer"
          target="_blank"
        >
          learn more
          <ExternalLink className="h-3 w-3" />
        </a>{" "}
        about {name}
      </span>
    </div>
  );
}
