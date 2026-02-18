import { useState } from "react";

import { AIProviderGuardDialog } from "../ai-provider-guard-dialog";
import { Button } from "../ui/button";
import { ScrollableCodeBlock } from "./scrollable-code-block";
import { SectionHeader } from "./section-header";

export function ToolCapabilityFailure({
  capabilityLabel,
  errorMessage,
  onRetry,
  providerGuardDescription,
  responseBody,
  retryMessage,
}: {
  capabilityLabel: string;
  errorMessage: string;
  onRetry?: (message: string) => void;
  providerGuardDescription?: string;
  responseBody?: string;
  retryMessage: string;
}) {
  const [showProviderGuard, setShowProviderGuard] = useState(false);
  const [providerAdded, setProviderAdded] = useState(false);

  return (
    <div>
      <SectionHeader>
        {capabilityLabel.charAt(0).toUpperCase() + capabilityLabel.slice(1)}{" "}
        failed
      </SectionHeader>
      <div className="mb-3 text-sm text-muted-foreground">{errorMessage}</div>
      {responseBody && (
        <ScrollableCodeBlock>{responseBody}</ScrollableCodeBlock>
      )}
      {providerGuardDescription && (
        <div className="mt-3 flex gap-2">
          {providerAdded ? (
            <Button
              onClick={() => {
                onRetry?.(retryMessage);
              }}
              size="sm"
              variant="default"
            >
              Retry {capabilityLabel}
            </Button>
          ) : (
            <Button
              onClick={() => {
                setShowProviderGuard(true);
              }}
              size="sm"
              variant="default"
            >
              Add an AI Provider
            </Button>
          )}
          <AIProviderGuardDialog
            description={providerGuardDescription}
            onOpenChange={setShowProviderGuard}
            onSuccess={() => {
              setProviderAdded(true);
            }}
            open={showProviderGuard}
          />
        </div>
      )}
    </div>
  );
}
