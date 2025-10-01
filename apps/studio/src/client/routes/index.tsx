import { vanillaRpcClient } from "@/client/rpc/client";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const appState = await vanillaRpcClient.appState.get();

    if (appState.hasCompletedProviderSetup) {
      redirect({
        throw: true,
        to: "/new-tab",
      });
    } else {
      redirect({
        throw: true,
        to: "/welcome",
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return null;
}
