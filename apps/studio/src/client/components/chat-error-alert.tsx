import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";

export function ChatErrorAlert({
  onStartNewChat,
}: {
  onStartNewChat: () => void;
}) {
  return (
    <Alert className="mt-4" variant="default">
      <AlertTriangle />
      <AlertDescription>
        If the error persists, try starting a new chat. Your app will not be
        affected.
        <Button
          className="mt-2"
          onClick={onStartNewChat}
          size="sm"
          variant="outline"
        >
          Start new chat
        </Button>
      </AlertDescription>
    </Alert>
  );
}
