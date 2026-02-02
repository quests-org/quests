import { DiscoverHorizontalSection } from "@/client/components/discover-horizontal-section";
import { rpcClient } from "@/client/rpc/client";
import { createIconMeta } from "@/shared/tabs";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/discover/")({
  component: RouteComponent,
  head: () => ({
    meta: [
      {
        title: "Discover",
      },
      createIconMeta("telescope"),
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
    <div className="mx-auto w-full max-w-7xl flex-1">
      <div>
        <div className="mx-auto px-4 pt-10 sm:px-6 lg:px-8 lg:pt-20 lg:pb-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Discover
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base/7 text-muted-foreground">
              Explore our collection of built-in templates.
              <br />
              Start building in seconds.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-16 px-4 py-12 sm:px-6 lg:px-8">
        <DiscoverHorizontalSection
          category="templates"
          description="Next.js, Svelte, Vue, and more"
          items={templates}
          title="Templates"
          viewAllHref="/discover/templates"
        />
      </div>
    </div>
  );
}
