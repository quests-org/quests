import { SUPPORT_EMAIL } from "@quests/shared";
import { AlertCircle } from "lucide-react";

import { EmailLink } from "./email-link";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

export function ContactErrorAlert({
  children,
  className,
  onRetry,
  subject = "Error Report",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  onRetry?: () => void;
  subject?: string;
  title: string;
}) {
  return (
    <Alert className={className} variant="destructive">
      <AlertCircle className="size-4" />
      <div className="col-start-2 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <div>{children}</div>
            <div className="text-xs text-muted-foreground">
              Need help?{" "}
              <EmailLink
                className="inline underline hover:no-underline"
                email={SUPPORT_EMAIL}
                subject={subject}
              >
                Contact us
              </EmailLink>
            </div>
          </AlertDescription>
        </div>
        {onRetry && (
          <Button
            className="text-primary"
            onClick={onRetry}
            size="sm"
            variant="outline"
          >
            Retry
          </Button>
        )}
      </div>
    </Alert>
  );
}
