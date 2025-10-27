import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/browser")({
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        {
          title: "Browser",
        },
        {
          content: "globe",
          name: META_TAG_LUCIDE_ICON,
        },
      ],
    };
  },
});

function RouteComponent() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-bold">Browser</h1>
        <p className="text-sm text-muted-foreground">
          Browser functionality coming soon.
        </p>
      </div>
    </div>
  );
}
