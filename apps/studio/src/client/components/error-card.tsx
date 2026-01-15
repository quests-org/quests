import { SUPPORT_EMAIL } from "@quests/shared";
import { rootRouteId, useMatch, useRouter } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

import { EmailLink } from "./email-link";
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

  const errors = normalizeErrors(error);
  const errorInfos = errors.map(extractErrorInfo);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorInfos.map((errorInfo, index) => (
          <Alert key={index} variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>
              {errorInfo.code && `[${errorInfo.code}] `}
              {errorInfos.length > 1 ? `Error ${index + 1}` : "Error Details"}
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <div>
                <code className="text-xs">{errorInfo.message}</code>
              </div>
              {errorInfo.cause != null && (
                <div className="mt-2">
                  <p className="text-xs font-medium">Cause:</p>
                  <code className="text-xs">
                    {formatCause(errorInfo.cause)}
                  </code>
                </div>
              )}
            </AlertDescription>
          </Alert>
        ))}
        {errorInfos.some((info) => info.stack) && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              View stack trace{errorInfos.length > 1 ? "s" : ""}
            </summary>
            <div className="mt-2 space-y-2">
              {errorInfos.map(
                (errorInfo, index) =>
                  errorInfo.stack && (
                    <div key={index}>
                      {errorInfos.length > 1 && (
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          Error {index + 1}:
                        </p>
                      )}
                      <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs text-muted-foreground">
                        {errorInfo.stack}
                      </pre>
                    </div>
                  ),
              )}
            </div>
          </details>
        )}
      </CardContent>
      <CardFooter className="justify-end gap-x-2">
        <Button asChild variant="ghost">
          <EmailLink email={SUPPORT_EMAIL}>Contact us</EmailLink>
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

function extractErrorInfo(error: unknown): {
  cause?: unknown;
  code?: string;
  message: string;
  stack?: string;
} {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "An unexpected error occurred";

  const stack = error instanceof Error && error.stack ? error.stack : undefined;

  const cause =
    error instanceof Error && "cause" in error ? error.cause : undefined;

  const code =
    error != null &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : undefined;

  return { cause, code, message, stack };
}

function formatCause(cause: unknown): string {
  if (typeof cause === "string") {
    return cause;
  }
  if (cause instanceof Error) {
    return cause.message;
  }
  try {
    return JSON.stringify(cause);
  } catch {
    return String(cause);
  }
}

function normalizeErrors(error: unknown): unknown[] {
  return Array.isArray(error) ? error.filter((e) => e != null) : [error];
}
