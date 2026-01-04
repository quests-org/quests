import { rpcClient } from "@/client/rpc/client";
import { safe } from "@orpc/client";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const [_appStateError, appState] = await safe(
      rpcClient.appState.get.call(),
    );
    const { data: hasToken } = await safe(rpcClient.auth.hasToken.call());

    if (appState?.hasCompletedProviderSetup || hasToken) {
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
