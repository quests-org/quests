import { providerMetadataAtom } from "@/client/atoms/provider-metadata";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { cn } from "@/client/lib/utils";
import { type ClientAIProviderConfig } from "@/shared/schemas/provider";
import { RECOMMENDED_TAG } from "@quests/ai-gateway/client";
import { useAtom, useAtomValue } from "jotai";
import { Award, ChefHat } from "lucide-react";

import { addProviderDialogAtom } from "../../atoms/add-provider";
import { AIProviderIcon } from "../ai-provider-icon";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";

interface ProviderSelectionScreenProps {
  providers: ClientAIProviderConfig[];
}

export function ProviderSelectionScreen({
  providers,
}: ProviderSelectionScreenProps) {
  const { sortedProviderMetadata } = useAtomValue(providerMetadataAtom);
  const [, dispatch] = useAtom(addProviderDialogAtom);

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
                    dispatch({
                      providerType: providerInfo.type,
                      type: "SELECT_PROVIDER",
                    });
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
                          tag === RECOMMENDED_TAG ? "brand-outline" : "outline"
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
                  dispatch({
                    providerType: "openai-compatible",
                    type: "SELECT_PROVIDER",
                  });
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
}
