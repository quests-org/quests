import { SUPPORT_EMAIL } from "@quests/shared";
import { AlertCircle } from "lucide-react";

import { EmailLink } from "./email-link";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

export function ErrorAlert({
  children,
  className,
  subject = "Error Report",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  subject?: string;
  title: string;
}) {
  return (
    <Alert className={className} variant="destructive">
      <AlertCircle className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <div>{children}</div>
        <div className="text-xs text-muted-foreground">
          Need help?{" "}
          <EmailLink
            className="underline hover:no-underline inline"
            email={SUPPORT_EMAIL}
            subject={subject}
          >
            Contact us
          </EmailLink>
        </div>
      </AlertDescription>
    </Alert>
  );
}
