import { createIconMeta } from "@/shared/tabs";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/browser")({
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        {
          title: "Browser",
        },
        createIconMeta("globe"),
      ],
    };
  },
});

function RouteComponent() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold">Browser</h1>
        <p className="text-sm text-muted-foreground">
          Browser functionality coming soon.
        </p>
      </div>
    </div>
  );
}
