import { vanillaRpcClient } from "@/client/rpc/client";
import { safe } from "@orpc/client";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/_not_authenticated")({
  beforeLoad: async () => {
    const [_error, user] = await safe(vanillaRpcClient.user.me({}));
    // Allowing these pages to load even if user errors because maybe it will
    // recover.
    if (user?.data?.id) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/" });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
