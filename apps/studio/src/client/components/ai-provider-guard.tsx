import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { rpcClient } from "@/client/rpc/client";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { useMutation } from "@tanstack/react-query";

interface AIProviderGuardProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function AIProviderGuard({ onOpenChange, open }: AIProviderGuardProps) {
  const { mutateAsync: openSettings } = useMutation(
    rpcClient.preferences.openSettingsWindow.mutationOptions(),
  );

  const handleAddProvider = async () => {
    await openSettings({
      showNewProviderDialog: true,
      tab: "Providers",
    });
    onOpenChange(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        aria-describedby={undefined}
        className="p-12 flex flex-col gap-6 max-w-md"
      >
        <DialogTitle className="sr-only">
          Add an AI provider to continue
        </DialogTitle>
        <div className="flex flex-col items-center gap-4">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-md">
            <QuestsAnimatedLogo size={64} />
          </div>
          <h2 className="text-2xl font-bold text-center">
            Add an AI provider to continue
          </h2>
          <p className="text-sm text-muted-foreground text-center">
            You need to add an AI provider to use AI features.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            onClick={handleAddProvider}
            variant="default"
          >
            Open Settings
          </Button>
          <Button
            className="w-full"
            onClick={() => {
              onOpenChange(false);
            }}
            variant="outline"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
