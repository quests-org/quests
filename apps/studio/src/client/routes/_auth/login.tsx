import { LoginForm } from "@/client/components/login-form";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/login")({
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
  return <LoginForm />;
}
