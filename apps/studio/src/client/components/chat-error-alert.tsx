import { AlertTriangle } from "lucide-react";

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
      <AlertTriangle />
      <AlertDescription className="flex flex-col gap-3">
        {message && <div className="text-xs">{message}</div>}
        <div className="text-xs">
          If the error persists, try starting a new chat. Your app will not be
          affected.
        </div>
        <Button onClick={onStartNewChat} size="sm" variant="outline">
          Start new chat
        </Button>
      </AlertDescription>
    </Alert>
  );
}
