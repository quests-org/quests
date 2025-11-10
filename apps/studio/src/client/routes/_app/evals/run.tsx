import { createFileRoute, redirect } from "@tanstack/react-router";

// Run route has been removed as of 2025-11-10
// TODO: Remove this migration after 2025-12-10

export const Route = createFileRoute("/_app/evals/run")({
  loader: () => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({
      search: { filter: "active" },
      to: "/projects",
    });
  },
});
