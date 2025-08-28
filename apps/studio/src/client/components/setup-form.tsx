import { SupportedProviders } from "@/client/components/supported-providers";
import { Button } from "@/client/components/ui/button";
import { cn } from "@/client/lib/utils";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";

export function SetupForm({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const { data: providers } = useQuery(
    rpcClient.provider.live.list.experimental_liveOptions(),
  );
  const hasProvider = (providers?.length ?? 0) > 0;

  const handleAddProvider = () => {
    void vanillaRpcClient.preferences.openSettingsWindow({
      showNewProviderDialog: true,
      tab: "Providers",
    });
    onClose?.();
  };

  const handleGetStarted = () => {
    void navigate({ to: "/new-tab" });
    onClose?.();
  };

  return (
    <div className={cn("flex flex-col gap-6 pb-12")}>
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-md">
            {hasProvider ? (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand">
                <Check className="h-6 w-6 text-brand-foreground" />
              </div>
            ) : (
              <QuestsAnimatedLogo size={64} />
            )}
          </div>
          <h1 className="text-3xl font-bold">
            {hasProvider ? "Setup complete!" : "Configure an AI provider"}
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {hasProvider
              ? "You can now start creating with Quests."
              : "Add an AI provider to get started. API keys are encrypted and stored locally."}
          </p>
        </div>

        {hasProvider ? (
          <Button
            className="w-full min-w-80"
            onClick={handleGetStarted}
            variant="default"
          >
            Get started
          </Button>
        ) : (
          <div className="flex flex-col gap-6 w-full min-w-80">
            <Button
              className="w-full"
              onClick={handleAddProvider}
              variant="default"
            >
              Add an AI provider
            </Button>
            <SupportedProviders />
          </div>
        )}
      </div>
    </div>
  );
}
