import { vanillaRpcClient } from "@/client/rpc/client";
import { safe } from "@orpc/client";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const [_appStateError, appState] = await safe(
      vanillaRpcClient.appState.get(),
    );
    const { data: user } = await safe(vanillaRpcClient.user.me());

    if (appState?.hasCompletedProviderSetup || user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/new-tab" });
    }
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({ to: "/welcome" });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return null;
}
