import { type SessionMessage } from "@quests/workspace/client";
import { AlertTriangle, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "./ui/button";

interface MessageErrorProps {
  defaultExpanded?: boolean;
  error: NonNullable<SessionMessage.Assistant["metadata"]["error"]>;
}

export function MessageError({
  defaultExpanded = false,
  error,
}: MessageErrorProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

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
    <div className="flex items-center gap-2 min-w-0 w-full text-xs leading-tight">
      <span className="shrink-0 text-warning-foreground/80">
        <AlertTriangle className="size-3" />
      </span>
      <span className="text-warning-foreground/80 font-medium shrink-0">
        {getErrorTitle()}
      </span>
      <span className="ml-auto text-warning-foreground/60 truncate text-right min-w-0">
        {getErrorTypeLabel()}
      </span>
      {isExpanded && (
        <span className="shrink-0 text-accent-foreground/60 ml-2">
          <ChevronUp className="size-3" />
        </span>
      )}
    </div>
  );

  return (
    <div className="w-full">
      <Button
        className="h-auto p-0 w-full justify-start hover:bg-accent/30 rounded-sm"
        onClick={handleToggle}
        variant="ghost"
      >
        {mainContent}
      </Button>

      {isExpanded && (
        <div className="mt-2 text-xs">
          <div className="p-2 bg-muted/30 rounded-md border max-h-64 overflow-y-auto">
            <div className="mb-2">
              <div className="mb-1 font-semibold">Error:</div>
              <pre className="whitespace-pre-wrap wrap-break-word font-mono text-xs">
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
                    <pre className="mt-1 p-2 bg-muted rounded text-xs max-h-32 overflow-y-auto whitespace-pre-wrap wrap-break-word">
                      {error.responseBody}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {error.kind === "invalid-tool-input" && (
              <div>
                <div className="mb-1 font-semibold">Input:</div>
                <pre className="p-2 bg-muted rounded text-xs max-h-32 overflow-y-auto whitespace-pre-wrap wrap-break-word font-mono border">
                  {error.input}
                </pre>
              </div>
            )}

            {error.kind === "no-such-tool" && (
              <div>
                <strong>Tool:</strong> {error.toolName}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
