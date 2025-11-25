import { InternalLink } from "@/client/components/internal-link";
import { Gem } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";

export function UpgradeSubscriptionAlert() {
  return (
    <Alert>
      <AlertTitle>Insufficient credits</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>
          You don&apos;t have enough credits to continue. Upgrade your plan to
          continue.
        </p>
        <div className="flex">
          <Button size="sm" variant="brand">
            <Gem className="size-3" />
            <InternalLink openInNewTab to="/subscribe">
              Get more credits
            </InternalLink>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
