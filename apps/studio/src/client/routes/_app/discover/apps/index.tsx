import { DiscoverPageLayout } from "@/client/components/discover-page-layout";
import { rpcClient } from "@/client/rpc/client";
import { createIconMeta } from "@/shared/tabs";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/discover/apps/")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Apps - Discover",
      },
      createIconMeta("telescope"),
    ],
  }),
  loader: async () => {
    const apps = await rpcClient.workspace.registry.template.listApps.call();
    return {
      apps,
    };
  },
});

function RouteComponent() {
  const { apps } = Route.useLoaderData();

  return (
    <DiscoverPageLayout
      breadcrumbs={[{ label: "Discover", to: "/discover" }, { label: "Apps" }]}
      category="apps"
      description="Explore our collection of built-in example apps"
      items={apps}
      showHero
      title="Discover Apps"
    />
  );
}
