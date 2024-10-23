import { LoginForm } from "@/client/components/login-form";
import { isFeatureEnabled } from "@/shared/features";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/login")({
  beforeLoad: () => {
    if (!isFeatureEnabled("questsAccounts")) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        {
          title: "Login",
        },
        {
          content: "log-in",
          name: META_TAG_LUCIDE_ICON,
        },
      ],
    };
  },
});

function RouteComponent() {
  return <LoginForm mode="signin" />;
}
