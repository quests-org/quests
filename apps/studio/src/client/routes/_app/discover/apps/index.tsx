import { DiscoverPageLayout } from "@/client/components/discover-page-layout";
import { vanillaRpcClient } from "@/client/rpc/client";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/discover/apps/")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Apps - Discover",
      },
      {
        content: "telescope",
        name: META_TAG_LUCIDE_ICON,
      },
    ],
  }),
  loader: async () => {
    const apps = await vanillaRpcClient.workspace.registry.template.listApps();
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
      showIcon={false}
      title="Discover Apps"
    />
  );
}
