import { AppIFrame } from "@/client/components/app-iframe";
import { ProjectSidebar } from "@/client/components/project-sidebar";
import { ProjectToolbar } from "@/client/components/project-toolbar";
import { VersionOverlay } from "@/client/components/version-overlay";
import { useProjectRouteSync } from "@/client/hooks/use-project-route-sync";
import { migrateProjectSubdomain } from "@/client/lib/migrate-project-subdomain";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { safe } from "@orpc/client";
import { ProjectSubdomainSchema, StoreId } from "@quests/workspace/client";
import {
  CancelledError,
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useRef } from "react";
import { z } from "zod";

const projectSearchSchema = z.object({
  selectedSessionId: StoreId.SessionSchema.optional(),
  selectedVersion: z.string().optional(),
});

function title(projectTitle?: string) {
  return `${projectTitle ?? "Not Found"} - Project`;
}

/* eslint-disable perfectionist/sort-objects */
export const Route = createFileRoute("/_app/projects/$subdomain/")({
  // Must come before component for type inference
  params: {
    parse: (rawParams) => {
      return {
        subdomain: ProjectSubdomainSchema.parse(rawParams.subdomain),
      };
    },
  },
  beforeLoad: async ({ params, search }) => {
    const [error, sessions, isDefined] = await safe(
      vanillaRpcClient.workspace.session.list({
        subdomain: params.subdomain,
      }),
    );

    if (error) {
      if (isDefined && error.code === "NOT_FOUND") {
        const migration = migrateProjectSubdomain(params.subdomain);

        if (migration.didMigrate) {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw redirect({
            to: "/projects/$subdomain",
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

    // If no session is selected, get sessions and redirect to the newest one
    if (!search.selectedSessionId && sessions.length > 0) {
      const newestSession = sessions.at(-1);

      if (newestSession) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw redirect({
          params: {
            subdomain: params.subdomain,
          },
          search: (prev) => ({
            ...prev,
            selectedSessionId: newestSession.id,
          }),
          to: "/projects/$subdomain",
        });
      }
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
        {
          title: title(project.data?.title),
        },
        {
          content: "square-dashed",
          name: META_TAG_LUCIDE_ICON,
        },
      ],
    };
  },
  validateSearch: projectSearchSchema,
});
/* eslint-enable perfectionist/sort-objects */

function RouteComponent() {
  const { subdomain } = Route.useParams();
  const { selectedVersion } = Route.useSearch();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const {
    data: project,
    error: projectError,
    isLoading: isProjectLoading,
  } = useQuery(
    rpcClient.workspace.project.live.bySubdomain.experimental_liveOptions({
      input: { subdomain },
      placeholderData: keepPreviousData,
    }),
  );

  // Load project-specific model selection
  const {
    data: projectState,
    error: projectStateError,
    isLoading: isProjectStateLoading,
  } = useQuery(
    rpcClient.workspace.project.state.get.queryOptions({
      input: { subdomain },
      placeholderData: keepPreviousData,
    }),
  );

  useProjectRouteSync(project);

  // Both queries must be loaded before rendering
  const isLoading = isProjectLoading || isProjectStateLoading;
  const error = projectError ?? projectStateError;

  if (isLoading) {
    return null;
  }

  if (error && !(error instanceof CancelledError)) {
    return <div>{error.message}</div>;
  }

  // Should never happen since both queries are required to load successfully
  if (!project || !projectState) {
    return null;
  }

  return (
    <div className="flex h-dvh w-full">
      <ProjectSidebar
        project={project}
        selectedModelURI={projectState.selectedModelURI}
        selectedVersion={selectedVersion}
      />

      <div className="flex-1 flex flex-col">
        <ProjectToolbar
          iframeRef={iframeRef}
          project={project}
          subdomain={subdomain}
        />
        <div className="flex-1 relative">
          <AppIFrame
            app={project}
            iframeRef={iframeRef}
            key={project.subdomain}
          />

          {selectedVersion && (
            <VersionOverlay
              projectSubdomain={subdomain}
              versionRef={selectedVersion}
            />
          )}
        </div>
      </div>
    </div>
  );
}
