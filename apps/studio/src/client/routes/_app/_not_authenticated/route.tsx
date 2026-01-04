import { rpcClient } from "@/client/rpc/client";
import { safe } from "@orpc/client";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/_not_authenticated")({
  beforeLoad: async () => {
    const { data: hasToken } = await safe(rpcClient.auth.hasToken.call());
    // Allowing these pages to load even if user errors because maybe it will
    // recover.
    if (hasToken) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
