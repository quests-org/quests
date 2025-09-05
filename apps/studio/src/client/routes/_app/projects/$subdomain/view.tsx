import { AppView } from "@/client/components/app-view";
import { useProjectRouteSync } from "@/client/hooks/use-project-route-sync";
import { migrateProjectSubdomain } from "@/client/lib/migrate-project-subdomain";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { safe } from "@orpc/client";
import { ProjectSubdomainSchema } from "@quests/workspace/client";
import {
  CancelledError,
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

/* eslint-disable perfectionist/sort-objects */
export const Route = createFileRoute("/_app/projects/$subdomain/view")({
  // Must come before component for type inference
  params: {
    parse: (rawParams) => {
      return {
        subdomain: ProjectSubdomainSchema.parse(rawParams.subdomain),
      };
    },
  },
  beforeLoad: async ({ params }) => {
    const [error, _, isDefined] = await safe(
      vanillaRpcClient.workspace.project.bySubdomain({
        subdomain: params.subdomain,
      }),
    );

    if (error) {
      if (isDefined && error.code === "NOT_FOUND") {
        const migration = migrateProjectSubdomain(params.subdomain);

        if (migration.didMigrate) {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw redirect({
            to: "/projects/$subdomain/view",
            params: {
              subdomain: migration.subdomain,
            },
          });
        }
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw notFound();
      }
      throw error;
    }
  },
  component: RouteComponent,
  head: async ({ params }) => {
    const project = await safe(
      vanillaRpcClient.workspace.project.bySubdomain({
        subdomain: params.subdomain,
      }),
    );

    return {
      meta: [
        { title: project.data?.title },
        { content: "app-window-mac", name: META_TAG_LUCIDE_ICON },
      ],
    };
  },
});
/* eslint-enable perfectionist/sort-objects */

function RouteComponent() {
  const { subdomain } = Route.useParams();

  const {
    data: project,
    error,
    isLoading,
  } = useQuery(
    rpcClient.workspace.project.live.bySubdomain.experimental_liveOptions({
      input: { subdomain },
      placeholderData: keepPreviousData,
    }),
  );

  useProjectRouteSync(project);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Should never happen, but just in case
  if (!project) {
    return null;
  }

  if (error) {
    // TODO avoid this entirely by keeping old data around
    if (error instanceof CancelledError) {
      return null;
    }

    return <div>{error.message}</div>;
  }

  return <AppView app={project} />;
}
