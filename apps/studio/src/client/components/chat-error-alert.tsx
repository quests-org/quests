import { SUPPORT_EMAIL } from "@quests/shared";

import { EmailLink } from "./email-link";
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
        <div className="text-center text-xs text-muted-foreground">
          Think this is a bug?{" "}
          <EmailLink
            className="inline underline hover:no-underline"
            email={SUPPORT_EMAIL}
            subject="Chat Error"
          >
            Contact us
          </EmailLink>
        </div>
      </AlertDescription>
    </Alert>
  );
}
