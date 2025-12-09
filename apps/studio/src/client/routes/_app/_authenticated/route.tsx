import { vanillaRpcClient } from "@/client/rpc/client";
import { safe } from "@orpc/client";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/_authenticated")({
  beforeLoad: async () => {
    const { data: user } = await safe(vanillaRpcClient.user.me());
    if (!user) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
