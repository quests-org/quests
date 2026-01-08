import { AISetupView } from "@/client/components/ai-setup-view";
import { createIconMeta } from "@/shared/tabs";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/setup")({
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        {
          title: "Setup",
        },
        createIconMeta("quests"),
      ],
    };
  },
});

function RouteComponent() {
  return <AISetupView mode="setup" />;
}
