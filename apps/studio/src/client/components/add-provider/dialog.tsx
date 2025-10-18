import { Dialog, DialogContent } from "@/client/components/ui/dialog";
import { cn } from "@/client/lib/utils";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { type ClientAIProviderConfig } from "@/shared/schemas/provider";
import { isDefinedError } from "@orpc/client";
import { AI_GATEWAY_API_KEY_NOT_NEEDED } from "@quests/shared";
import { useMutation } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { useEffect } from "react";

import { addProviderDialogAtom } from "../../atoms/add-provider";
import { selectedModelURIAtom } from "../../atoms/selected-models";
import { fixURL } from "../../lib/fix-url";
import { OpenAICompatibleConfigScreen } from "./openai-compatible-config-screen";
import { ProviderSelectionScreen } from "./provider-selection-screen";
import { StandardProviderConfigScreen } from "./standard-provider-config-screen";

export function AddProviderDialog({
  onOpenChange,
  onSuccess,
  open,
  providers = [],
}: {
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  open: boolean;
  providers?: ClientAIProviderConfig[];
}) {
  const [selectedModelURI, setSelectedModelURI] = useAtom(selectedModelURIAtom);
  const [state, dispatch] = useAtom(addProviderDialogAtom);

  const createMutation = useMutation(
    rpcClient.providerConfig.create.mutationOptions(),
  );

  useEffect(() => {
    if (open) {
      dispatch({ type: "RESET" });
    }
  }, [open, dispatch]);

  const hasOpenAICompatibleProvider =
    state.selectedOpenAICompatibleProvider !== undefined;
  const isCustomProvider = state.isCustomProvider;

  const handleSave = async (skipValidation = false) => {
    if (!state.selectedProviderType) {
      return;
    }

    const isOpenAICompatible =
      state.selectedProviderType === "openai-compatible";

    if (isOpenAICompatible) {
      const requiresAPIKey =
        hasOpenAICompatibleProvider && state.selectedOpenAICompatibleProvider
          ? (state.selectedOpenAICompatibleProvider.requiresAPIKey ?? true)
          : true;

      if (
        !state.baseURL ||
        (requiresAPIKey && !state.apiKey) ||
        (isCustomProvider && !state.displayName.trim())
      ) {
        return;
      }
    }

    const normalizedBaseURL = isOpenAICompatible
      ? fixURL(state.baseURL)
      : undefined;

    if (normalizedBaseURL && normalizedBaseURL !== state.baseURL) {
      dispatch({ type: "SET_BASE_URL", value: normalizedBaseURL });
    }

    const finalDisplayName = hasOpenAICompatibleProvider
      ? state.selectedOpenAICompatibleProvider?.name
      : state.displayName.trim() || undefined;

    const subType = hasOpenAICompatibleProvider
      ? state.selectedOpenAICompatibleProvider?.subType
      : undefined;

    const requiresAPIKey = (() => {
      if (isOpenAICompatible) {
        return hasOpenAICompatibleProvider
          ? (state.selectedOpenAICompatibleProvider?.requiresAPIKey ?? true)
          : true;
      }
      return true;
    })();

    try {
      await createMutation.mutateAsync(
        {
          config: {
            apiKey: requiresAPIKey
              ? state.apiKey
              : AI_GATEWAY_API_KEY_NOT_NEEDED,
            baseURL: normalizedBaseURL,
            displayName: finalDisplayName,
            subType,
            type: state.selectedProviderType,
          },
          skipValidation,
        },
        {
          onError: (error) => {
            if (isDefinedError(error)) {
              dispatch({
                message: error.message,
                type: "SET_ERROR",
                validationFailed: true,
              });
            } else {
              dispatch({
                message: "Failed to validate provider",
                type: "SET_ERROR",
                validationFailed: true,
              });
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
      // Handled in onError
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={cn(
          "transition-none",
          state.stage === "configuration" ? "sm:max-w-lg" : "sm:max-w-xl",
        )}
      >
        {state.stage === "provider-selection" && (
          <ProviderSelectionScreen providers={providers} />
        )}
        {state.stage === "configuration" &&
          state.selectedProviderType &&
          state.selectedProviderType !== "openai-compatible" && (
            <StandardProviderConfigScreen
              onSave={handleSave}
              providerType={state.selectedProviderType}
              saving={createMutation.isPending}
            />
          )}
        {state.stage === "configuration" &&
          state.selectedProviderType === "openai-compatible" && (
            <OpenAICompatibleConfigScreen
              onSave={handleSave}
              saving={createMutation.isPending}
            />
          )}
      </DialogContent>
    </Dialog>
  );
}
