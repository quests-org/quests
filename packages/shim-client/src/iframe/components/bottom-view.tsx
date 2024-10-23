import { type HeartbeatResponse } from "@quests/workspace/for-shim";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Loader2, Maximize, X } from "lucide-react";

import { ErrorConsole } from "./error-console";

interface BottomViewProps {
  onDisplayModeChange: (mode: "corner" | "full") => void;
  response: HeartbeatResponse | null;
  status: HeartbeatResponse["status"] | null;
}

export function BottomView({
  onDisplayModeChange,
  response,
  status,
}: BottomViewProps) {
  const { text } = getStatusInfo(status || "loading");
  const hasErrors = response?.errors && response.errors.length > 0;

  return (
    <div className="relative size-full bg-white p-4 shadow-inner">
      <div className="flex h-full flex-col">
        <div className="flex items-center">
          {status === "loading" ? (
            <div className="flex items-center">
              <div className="relative mr-2 h-4 w-4">
                <div className="absolute inset-0 animate-pulse rounded-full"></div>
                <Loader2 className="absolute inset-0 h-4 w-4 animate-spin text-blue-500" />
              </div>
            </div>
          ) : hasErrors ? (
            <AlertCircle className="mr-2 h-4 w-4 text-red-500" />
          ) : status === "ready" ? (
            <div className="mr-2 h-3 w-3 rounded-full bg-green-500" />
          ) : (
            <div className="mr-2 h-3 w-3 rounded-full bg-yellow-500" />
          )}
          <span className="font-medium text-gray-700">{text}</span>
          {hasErrors && (
            <span className="ml-2 text-sm text-gray-500">
              ({response.errors.length} error
              {response.errors.length > 1 ? "s" : ""})
              {response.errors[0]?.createdAt && (
                <span className="ml-1">
                  · last{" "}
                  {formatDistanceToNow(response.errors[0].createdAt, {
                    addSuffix: true,
                  })}
                </span>
              )}
            </span>
          )}
        </div>

        {response && (
          <ErrorConsole className="mt-2 flex-1" errors={response.errors} />
        )}
      </div>

      <div className="absolute right-2 top-2 flex gap-1">
        <button
          className="rounded p-1 hover:bg-gray-100"
          onClick={() => {
            onDisplayModeChange("full");
          }}
          title="Expand to full screen"
        >
          <Maximize className="h-4 w-4 text-gray-500" />
        </button>
        <button
          className="rounded p-1 hover:bg-gray-100"
          onClick={() => {
            onDisplayModeChange("corner");
          }}
          title="Close"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
}

function getStatusInfo(status: HeartbeatResponse["status"] = "loading") {
  switch (status) {
    case "loading": {
      return {
        text: "Loading",
      };
    }
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
