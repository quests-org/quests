import { rpcClient } from "@/client/rpc/client";
import { NEW_ISSUE_URL } from "@quests/shared";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";

import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";

export function ChatErrorAlert({
  message,
  onStartNewChat,
}: {
  message?: string;
  onStartNewChat: () => void;
}) {
  const openExternalLinkMutation = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
  );

  return (
    <Alert className="mt-4" variant="warning">
      <AlertDescription className="flex flex-col gap-3">
        {message && <div className="text-xs">{message}</div>}
        <div className="text-xs">
          If the error persists, try starting a new chat. Your app will not be
          affected.
        </div>
        <Button onClick={onStartNewChat} size="sm" variant="outline">
          Start new chat
        </Button>
        <div className="text-xs text-center text-muted-foreground">
          Think this is a bug?{" "}
          <button
            className="underline hover:no-underline inline"
            onClick={() => {
              void openExternalLinkMutation.mutateAsync({
                url: NEW_ISSUE_URL,
              });
            }}
          >
            Report an issue
          </button>{" "}
          <ExternalLink className="size-3 inline" />
        </div>
      </AlertDescription>
    </Alert>
  );
}
