import { DiscoverHorizontalSection } from "@/client/components/discover-horizontal-section";
import { useReload } from "@/client/hooks/use-reload";
import { vanillaRpcClient } from "@/client/rpc/client";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
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
    const [apps, templates] = await Promise.all([
      vanillaRpcClient.workspace.registry.template.listApps(),
      vanillaRpcClient.workspace.registry.template.listTemplates(),
    ]);
    return {
      apps,
      templates,
    };
  },
});

function RouteComponent() {
  useReload();
  const { apps, templates } = Route.useLoaderData();

  return (
    <div className="flex-1 mx-auto max-w-7xl w-full">
      <div>
        <div className="mx-auto px-4 pt-10 lg:pt-20 lg:pb-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Discover
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground max-w-lg mx-auto">
              Explore our collection of built-in templates and apps.
              <br />
              Start building in seconds.
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-12 sm:px-6 lg:px-8 space-y-16">
        <DiscoverHorizontalSection
          category="templates"
          description="Next.js, Svelte, Vue, and more"
          items={templates}
          showIcon={false}
          title="Templates"
          viewAllHref="/discover/templates"
        />

        <DiscoverHorizontalSection
          category="apps"
          description="Explore example apps"
          items={apps}
          showIcon={false}
          title="Apps"
          viewAllHref="/discover/apps"
        />
      </div>
    </div>
  );
}
