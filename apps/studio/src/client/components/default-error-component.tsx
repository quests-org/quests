import type { ErrorComponentProps } from "@tanstack/react-router";

import { ErrorCard } from "./error-card";

export function DefaultErrorComponent({ error }: ErrorComponentProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center p-6">
      <ErrorCard error={error} />
    </div>
  );
}
