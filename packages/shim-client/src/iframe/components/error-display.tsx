import { type HeartbeatResponse } from "@quests/workspace/for-shim";
import { AlertCircle } from "lucide-react";

import { ErrorConsole } from "./error-console";

interface ErrorDisplayProps {
  fullscreen?: boolean;
  response: HeartbeatResponse | null;
}

export function ErrorDisplay({ response }: ErrorDisplayProps) {
  if (!response) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
      <div className="relative max-w-2xl rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-4 flex items-center">
          <AlertCircle className="mr-3 h-6 w-6 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-800">Error</h2>
        </div>

        <ErrorConsole className="mt-4 max-h-96" errors={response.errors} />
      </div>
    </div>
  );
}
