import { SUPPORT_EMAIL } from "@quests/shared";
import { rootRouteId, useMatch, useRouter } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { ExternalLink } from "./external-link";
import { InternalLink } from "./internal-link";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function ErrorCard({
  description = "We encountered an error while processing your request",
  error,
  title = "Something went wrong",
}: {
  description?: string;
  error: unknown;
  title?: string;
}) {
  const router = useRouter();
  const isRoot = useMatch({
    select: (state) => state.id === rootRouteId,
    strict: false,
  });

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "An unexpected error occurred";

  const errorStack =
    error instanceof Error && error.stack ? error.stack : undefined;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <p className="text-muted-foreground mt-1.5 text-sm">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error Details</AlertTitle>
          <AlertDescription>
            <code className="text-xs">{errorMessage}</code>
          </AlertDescription>
        </Alert>
        {errorStack && (
          <details className="group">
            <summary className="text-muted-foreground cursor-pointer text-sm font-medium hover:text-foreground">
              View stack trace
            </summary>
            <pre className="text-muted-foreground mt-2 max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
              {errorStack}
            </pre>
          </details>
        )}
      </CardContent>
      <CardFooter className="justify-end gap-x-2">
        <Button asChild variant="ghost">
          <ExternalLink
            href={`mailto:${SUPPORT_EMAIL}`}
            onClick={() => {
              void navigator.clipboard.writeText(SUPPORT_EMAIL);
              toast.info(`Copied ${SUPPORT_EMAIL} to clipboard`);
            }}
          >
            Contact us
          </ExternalLink>
        </Button>
        {isRoot ? (
          <Button asChild variant="outline">
            <InternalLink to="/">Home</InternalLink>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <InternalLink
              onClick={(e) => {
                e.preventDefault();
                window.history.back();
              }}
              to="/"
            >
              Go back
            </InternalLink>
          </Button>
        )}
        <Button
          onClick={() => {
            void router.invalidate();
          }}
        >
          Try again
        </Button>
      </CardFooter>
    </Card>
  );
}
