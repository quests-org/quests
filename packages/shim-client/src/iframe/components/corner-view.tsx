import { type HeartbeatResponse } from "@quests/workspace/for-shim";
import { AlertCircle, Loader2 } from "lucide-react";

interface CornerViewProps {
  response: HeartbeatResponse | null;
  status: HeartbeatResponse["status"];
}

export function CornerView({ response, status }: CornerViewProps) {
  const hasErrors = response?.errors && response.errors.length > 0;
  const errorCount = response?.errors.length ?? 0;

  if (status === "ready" && !hasErrors) {
    return null;
  }

  if (hasErrors) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 shadow-sm">
        <AlertCircle className="size-3" />
        <span>{errorCount}</span>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 shadow-sm">
        <Loader2 className="size-3 animate-spin" />
        <span>Loading</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 shadow-sm">
      <div className="size-2 rounded-full bg-amber-500" />
      <span>Pending</span>
    </div>
  );
}
