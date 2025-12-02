import { userAtom } from "@/client/atoms/user";
import { vanillaRpcClient } from "@/client/rpc/client";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getDefaultStore } from "jotai";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const appState = await vanillaRpcClient.appState.get();
    const store = getDefaultStore();
    const userResult = await store.get(userAtom);

    if (appState.hasCompletedProviderSetup || userResult.data?.id) {
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
