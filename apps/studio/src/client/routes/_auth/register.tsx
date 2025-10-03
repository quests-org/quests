import { LoginForm } from "@/client/components/login-form";
import { vanillaRpcClient } from "@/client/rpc/client";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/register")({
  beforeLoad: async () => {
    const features = await vanillaRpcClient.features.getAll();
    if (!features.questsAccounts) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
  head: () => {
    return {
      meta: [
        {
          title: "Register",
        },
        {
          content: "user-plus",
          name: META_TAG_LUCIDE_ICON,
        },
      ],
    };
  },
});

function RouteComponent() {
  return <LoginForm mode="signup" />;
}
