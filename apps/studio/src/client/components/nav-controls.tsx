import { Button } from "@/client/components/ui/button";
import { logger } from "@/client/lib/logger";
import { rpcClient } from "@/client/rpc/client";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function NavControls() {
  const { mutateAsync: navigateBack } = useMutation(
    rpcClient.tabs.navigateCurrentBack.mutationOptions(),
  );

  const { mutateAsync: navigateForward } = useMutation(
    rpcClient.tabs.navigateCurrentForward.mutationOptions(),
  );

  const handleBack = async () => {
    try {
      await navigateBack({});
    } catch (error) {
      logger.error("Error navigating back", { error });
    }
  };

  const handleForward = async () => {
    try {
      await navigateForward({});
    } catch (error) {
      logger.error("Error navigating forward", { error });
    }
  };

  return (
    <div className="flex items-center gap-1 pr-1">
      <Button
        className="size-6 text-muted-foreground"
        onClick={handleBack}
        size="icon"
        title="Go back"
        variant="ghost"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        className="size-6 text-muted-foreground"
        onClick={handleForward}
        size="icon"
        title="Go forward"
        variant="ghost"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
