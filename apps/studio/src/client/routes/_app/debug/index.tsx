import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/debug/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <p className="text-sm text-muted-foreground mt-48">
        Select a debug page above
      </p>
    </div>
  );
}
