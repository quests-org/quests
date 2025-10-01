import type { ErrorComponentProps } from "@tanstack/react-router";

import { rpcClient } from "@/client/rpc/client";
import { NEW_ISSUE_URL } from "@quests/shared";
import { useMutation } from "@tanstack/react-query";
import { rootRouteId, useMatch, useRouter } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

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

export function DefaultErrorComponent({ error }: ErrorComponentProps) {
  const router = useRouter();
  const isRoot = useMatch({
    select: (state) => state.id === rootRouteId,
    strict: false,
  });

  const openExternalLinkMutation = useMutation(
    rpcClient.utils.openExternalLink.mutationOptions(),
  );

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "An unexpected error occurred";

  const errorStack =
    error instanceof Error && error.stack ? error.stack : undefined;

  return (
    <div className="flex min-w-0 flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-start justify-between gap-x-4">
            <div className="flex-1">
              <CardTitle className="text-xl">Something went wrong</CardTitle>
              <p className="text-muted-foreground mt-1.5 text-sm">
                We encountered an error while processing your request
              </p>
            </div>
            <Button
              onClick={() => {
                void openExternalLinkMutation.mutateAsync({
                  url: NEW_ISSUE_URL,
                });
              }}
              size="sm"
              variant="outline"
            >
              Report Issue
            </Button>
          </div>
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
        <CardFooter className="justify-end gap-2">
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
                Go Back
              </InternalLink>
            </Button>
          )}
          <Button
            onClick={() => {
              void router.invalidate();
            }}
          >
            Try Again
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
