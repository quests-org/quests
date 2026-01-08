import { AISetupView } from "@/client/components/ai-setup-view";
import { createIconMeta } from "@/shared/tabs";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/_not_authenticated/sign-in")({
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        {
          title: "Sign in",
        },
        createIconMeta("quests"),
      ],
    };
  },
});

function RouteComponent() {
  return <AISetupView mode="sign-in" />;
}
