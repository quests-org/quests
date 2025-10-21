import { selectedModelURIAtom } from "@/client/atoms/selected-model";
import { Dialog, DialogContent } from "@/client/components/ui/dialog";
import { fixURL } from "@/client/lib/fix-url";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { type ClientAIProviderConfig } from "@/shared/schemas/provider";
import { isDefinedError } from "@orpc/client";
import { AI_GATEWAY_API_KEY_NOT_NEEDED } from "@quests/shared";
import { useMutation } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { useEffect } from "react";

import { addProviderDialogAtom } from "../../atoms/add-provider";
import { providerMetadataAtom } from "../../atoms/provider-metadata";
import { ProviderConfigScreen } from "./provider-config-screen";

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
  const { providerMetadataMap } = useAtomValue(providerMetadataAtom);

  const createMutation = useMutation(
    rpcClient.providerConfig.create.mutationOptions(),
  );

  useEffect(() => {
    if (open) {
      dispatch({ type: "RESET" });
    }
  }, [open, dispatch]);

  const handleSave = async (skipValidation = false) => {
    if (!state.selectedProviderType) {
      return;
    }

    const providerMetadata = providerMetadataMap.get(
      state.selectedProviderType,
    );
    const requiresAPIKey = providerMetadata?.requiresAPIKey ?? true;
    const isOpenAICompatible =
      state.selectedProviderType === "openai-compatible";

    const normalizedBaseURL =
      isOpenAICompatible && state.baseURL ? fixURL(state.baseURL) : undefined;

    if (normalizedBaseURL && normalizedBaseURL !== state.baseURL) {
      dispatch({ type: "SET_BASE_URL", value: normalizedBaseURL });
    }

    try {
      await createMutation.mutateAsync(
        {
          config: {
            apiKey: requiresAPIKey
              ? state.apiKey
              : AI_GATEWAY_API_KEY_NOT_NEEDED,
            baseURL: normalizedBaseURL,
            displayName: state.displayName.trim() || undefined,
            type: state.selectedProviderType,
          },
          skipValidation,
        },
        {
          onError: (error) => {
            if (isDefinedError(error)) {
              const isBadRequest = error.code === "BAD_REQUEST";
              dispatch({
                allowBypass: !isBadRequest,
                message: error.message,
                type: "SET_ERROR",
                validationFailed: true,
              });
            } else {
              dispatch({
                allowBypass: false,
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
      <DialogContent className="transition-none sm:max-w-lg">
        <ProviderConfigScreen
          onSave={handleSave}
          providers={providers}
          saving={createMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
