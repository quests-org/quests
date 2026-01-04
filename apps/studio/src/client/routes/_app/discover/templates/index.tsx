import { DiscoverPageLayout } from "@/client/components/discover-page-layout";
import { rpcClient } from "@/client/rpc/client";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/discover/templates/")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Templates - Discover",
      },
      {
        content: "square-dashed",
        name: META_TAG_LUCIDE_ICON,
      },
    ],
  }),
  loader: async () => {
    const templates =
      await rpcClient.workspace.registry.template.listTemplates.call();
    return {
      templates,
    };
  },
});

function RouteComponent() {
  const { templates } = Route.useLoaderData();

  return (
    <DiscoverPageLayout
      breadcrumbs={[
        { label: "Discover", to: "/discover" },
        { label: "Templates" },
      ]}
      category="templates"
      description="Next.js, Svelte, Vue, and more"
      items={templates}
      showIcon={false}
      title="Templates"
    />
  );
}
