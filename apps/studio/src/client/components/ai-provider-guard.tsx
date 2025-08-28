import { SupportedProviders } from "@/client/components/supported-providers";
import { Button } from "@/client/components/ui/button";
import { rpcClient } from "@/client/rpc/client";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { useMutation } from "@tanstack/react-query";

export function AIProviderGuard({
  description,
  onClose,
}: {
  description: string;
  onClose?: () => void;
}) {
  const { mutateAsync: openSettings } = useMutation(
    rpcClient.preferences.openSettingsWindow.mutationOptions(),
  );

  const handleAddProvider = async () => {
    await openSettings({
      showNewProviderDialog: true,
      tab: "Providers",
    });
    onClose?.();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-md">
          <QuestsAnimatedLogo size={64} />
        </div>
        <h2 className="text-2xl font-bold text-center">
          Add an AI provider to continue
        </h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-6 w-full max-w-sm">
        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            onClick={handleAddProvider}
            variant="default"
          >
            Add an AI provider
          </Button>
        </div>

        <SupportedProviders />
      </div>
    </div>
  );
}
