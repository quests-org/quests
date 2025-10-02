import { NEW_ISSUE_URL } from "@quests/shared";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";

import { ExternalLink } from "./external-link";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";

export function ChatErrorAlert({
  message,
  onStartNewChat,
}: {
  message?: string;
  onStartNewChat: () => void;
}) {
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
          <ExternalLink
            className="underline hover:no-underline inline"
            href={NEW_ISSUE_URL}
          >
            Report an issue
          </ExternalLink>{" "}
          <ExternalLinkIcon className="size-3 inline" />
        </div>
      </AlertDescription>
    </Alert>
  );
}
