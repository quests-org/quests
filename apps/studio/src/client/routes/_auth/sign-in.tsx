import { AISetupView } from "@/client/components/ai-setup-view";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/sign-in")({
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        {
          title: "Sign in",
        },
        {
          content: "quests",
          name: META_TAG_LUCIDE_ICON,
        },
      ],
    };
  },
});

function RouteComponent() {
  return <AISetupView mode="sign-in" />;
}
