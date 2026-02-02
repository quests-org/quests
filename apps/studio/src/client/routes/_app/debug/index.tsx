import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/debug/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex size-full items-center justify-center">
      <p className="mt-48 text-sm text-muted-foreground">
        Select a debug page above
      </p>
    </div>
  );
}
