import { DiscoverAppsGrid } from "@/client/components/discover-apps-grid";
import { useReload } from "@/client/hooks/use-reload";
import { vanillaRpcClient } from "@/client/rpc/client";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { QuestsAnimatedLogo } from "@quests/components/animated-logo";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/discover/")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Discover",
      },
      {
        content: "layout-grid",
        name: META_TAG_LUCIDE_ICON,
      },
    ],
  }),
  loader: async () => {
    const registryApps = await vanillaRpcClient.workspace.registry.app.list();
    return {
      registryApps,
    };
  },
});

function RouteComponent() {
  const { registryApps } = Route.useLoaderData();

  useReload();

  return (
    <div className="w-full flex-1">
      <div>
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-12 lg:px-8">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <QuestsAnimatedLogo size={48} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Discover
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground max-w-lg mx-auto">
              Explore our collection of built-in apps and templates. Launch an
              app and start building in seconds.
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-6xl xl:max-w-7xl">
          <DiscoverAppsGrid registryApps={registryApps} />
        </div>
      </div>
    </div>
  );
}
