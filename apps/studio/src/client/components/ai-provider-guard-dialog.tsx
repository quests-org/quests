import { AIProviderGuard } from "@/client/components/ai-provider-guard";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/client/components/ui/dialog";

export function AIProviderGuardDialog({
  description,
  onOpenChange,
  open,
}: {
  description: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent aria-describedby={undefined} className="p-6 max-w-md">
        <DialogTitle className="sr-only">
          Add an AI provider to continue
        </DialogTitle>
        <AIProviderGuard
          description={description}
          onClose={() => {
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
