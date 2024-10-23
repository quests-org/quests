import { type HeartbeatResponse } from "@quests/workspace/for-shim";
import { AlertCircle, Loader2, X } from "lucide-react";

import { ErrorConsole } from "./error-console";
import { ErrorDisplay } from "./error-display";
import { NotFoundDisplay } from "./not-found-display";

interface FullViewProps {
  onDisplayModeChange: (mode: "bottom" | "corner") => void;
  response: HeartbeatResponse | null;
}

export function FullView({ onDisplayModeChange, response }: FullViewProps) {
  if (!response) {
    return null;
  }

  if (response.status === "loading") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={() => {
          onDisplayModeChange("corner");
        }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-gray-100" />
      </div>
    );
  }

  if (response.status === "not-found" || response.status === "not-runnable") {
    return <NotFoundDisplay status={response.status} />;
  }

  // Show full screen error display only for critical errors
  if (response.status === "error") {
    return <ErrorDisplay response={response} />;
  }

  const { text } = getStatusInfo(response.status);
  const hasErrors = response.errors.length > 0;

  return (
    <div className="fixed inset-4 flex items-stretch justify-center rounded-2xl bg-gray-50/95 backdrop-blur-xs">
      <div className="relative flex h-full w-full max-w-6xl flex-col gap-6 overflow-hidden bg-white p-8 shadow-2xl">
        <button
          className="absolute right-4 top-4 rounded-lg p-2 hover:bg-gray-100"
          onClick={() => {
            onDisplayModeChange("bottom");
          }}
          title="Close"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>

        <div className="flex items-center">
          {hasErrors ? (
            <AlertCircle className="mr-4 h-8 w-8 text-red-500" />
          ) : response.status === "ready" ? (
            <div className="mr-4 h-5 w-5 rounded-full bg-green-500" />
          ) : (
            <div className="mr-4 h-5 w-5 rounded-full bg-yellow-500" />
          )}
          <h2 className="text-2xl font-semibold text-gray-800">{text}</h2>
        </div>

        <ErrorConsole className="flex-1 rounded-lg" errors={response.errors} />
      </div>
    </div>
  );
}

function getStatusInfo(status: HeartbeatResponse["status"] = "ready") {
  switch (status) {
    case "ready": {
      return {
        text: "Ready",
      };
    }
    case "stopped": {
      return {
        text: "Stopped",
      };
    }
    default: {
      return {
        text: status,
      };
    }
  }
}
