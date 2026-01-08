import {
  isInsufficientCreditsError,
  type SessionMessage,
} from "@quests/workspace/client";
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

import {
  CollapsiblePartHeader,
  CollapsiblePartMainContent,
  CollapsiblePartTrigger,
} from "./collapsible-part";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { UpgradeSubscriptionAlert } from "./upgrade-subscription-alert";

interface MessageErrorProps {
  defaultExpanded?: boolean;
  message: SessionMessage.Assistant;
  onContinue: () => void;
  showUpgradeAlertIfApplicable?: boolean;
}

export function MessageError({
  defaultExpanded = false,
  message,
  onContinue,
  showUpgradeAlertIfApplicable = false,
}: MessageErrorProps) {
  const error = message.metadata.error;
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  if (!error) {
    return null;
  }

  if (showUpgradeAlertIfApplicable && isInsufficientCreditsError(message)) {
    return <UpgradeSubscriptionAlert onContinue={onContinue} />;
  }

  const getErrorTitle = () => {
    switch (error.kind) {
      case "aborted": {
        return "Aborted";
      }
      case "api-call":
      case "api-key":
      case "invalid-tool-input":
      case "no-such-tool": {
        return "Model Error";
      }
      default: {
        return "Error";
      }
    }
  };

  const getErrorTypeLabel = () => {
    switch (error.kind) {
      case "aborted": {
        return "Aborted";
      }
      case "api-call": {
        return "API Call Error";
      }
      case "api-key": {
        return "API Key Error";
      }
      case "invalid-tool-input": {
        return "Invalid Tool Input";
      }
      case "no-such-tool": {
        return "Tool Not Found";
      }
      case "unknown": {
        return "Unknown Error";
      }
      default: {
        return "Error";
      }
    }
  };

  const mainContent = (
    <CollapsiblePartHeader isExpanded={isExpanded}>
      <span className="shrink-0 text-warning-foreground/80">
        <AlertTriangle className="size-3" />
      </span>
      <span className="shrink-0 font-medium text-warning-foreground/80">
        {getErrorTitle()}
      </span>
      <span className="ml-auto min-w-0 truncate text-right text-warning-foreground/60">
        {getErrorTypeLabel()}
      </span>
    </CollapsiblePartHeader>
  );

  return (
    <Collapsible
      className="w-full"
      onOpenChange={setIsExpanded}
      open={isExpanded}
    >
      <CollapsibleTrigger asChild>
        <CollapsiblePartTrigger>{mainContent}</CollapsiblePartTrigger>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <CollapsiblePartMainContent>
          <div className="mb-2">
            <div className="mb-1 font-semibold">Error:</div>
            <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap">
              {error.message}
            </pre>
          </div>

          {error.kind === "api-call" && (
            <div className="space-y-1">
              <div>
                <strong>API:</strong> {error.name}
              </div>
              <div className="break-all">
                <strong>URL:</strong> {error.url}
              </div>
              {error.statusCode && (
                <div>
                  <strong>Status:</strong> {error.statusCode}
                </div>
              )}
              {error.responseBody && (
                <div>
                  <strong>Response:</strong>
                  <pre className="mt-1 max-h-32 overflow-y-auto rounded bg-muted p-2 text-xs wrap-break-word whitespace-pre-wrap">
                    {error.responseBody}
                  </pre>
                </div>
              )}
            </div>
          )}

          {error.kind === "invalid-tool-input" && (
            <div>
              <div className="mb-1 font-semibold">Input:</div>
              <pre className="max-h-32 overflow-y-auto rounded border bg-muted p-2 font-mono text-xs wrap-break-word whitespace-pre-wrap">
                {error.input}
              </pre>
            </div>
          )}

          {error.kind === "no-such-tool" && (
            <div>
              <strong>Tool:</strong> {error.toolName}
            </div>
          )}
        </CollapsiblePartMainContent>
      </CollapsibleContent>
    </Collapsible>
  );
}
