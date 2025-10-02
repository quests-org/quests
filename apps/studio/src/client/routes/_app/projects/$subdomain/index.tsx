import { promptValueAtomFamily } from "@/client/atoms/prompt-value";
import { AppView } from "@/client/components/app-view";
import { ProjectDeleteDialog } from "@/client/components/project-delete-dialog";
import { ProjectHeaderToolbar } from "@/client/components/project-header-toolbar";
import { ProjectSidebar } from "@/client/components/project-sidebar";
import { VersionOverlay } from "@/client/components/version-overlay";
import { useProjectRouteSync } from "@/client/hooks/use-project-route-sync";
import { migrateProjectSubdomain } from "@/client/lib/migrate-project-subdomain";
import { cn } from "@/client/lib/utils";
import { rpcClient, vanillaRpcClient } from "@/client/rpc/client";
import { META_TAG_LUCIDE_ICON } from "@/shared/tabs";
import { safe } from "@orpc/client";
import { ProjectSubdomainSchema, StoreId } from "@quests/workspace/client";
import {
  CancelledError,
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";
import {
  createFileRoute,
  notFound,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

const projectSearchSchema = z.object({
  selectedSessionId: StoreId.SessionSchema.optional(),
  selectedVersion: z.string().optional(),
  showDelete: z.boolean().optional(),
});

function title(projectTitle?: string) {
  return `${projectTitle ?? "Not Found"} · Project`;
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
  onLeave: ({ params }) => {
    // Garbage collect project atoms
    promptValueAtomFamily.remove(params.subdomain);
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
  const { selectedVersion, showDelete } = Route.useSearch();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (showDelete) {
      setShowDeleteDialog(true);
      void navigate({
        from: "/projects/$subdomain",
        params: {
          subdomain,
        },
        replace: true,
        search: (prev) => ({ ...prev, showDelete: undefined }),
      });
    }
  }, [showDelete, navigate, subdomain]);

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
    <div className="flex flex-col h-dvh w-full overflow-hidden">
      <ProjectHeaderToolbar
        onDeleteClick={() => {
          setShowDeleteDialog(true);
        }}
        onSidebarToggle={() => {
          setSidebarCollapsed(!sidebarCollapsed);
        }}
        project={project}
        selectedVersion={selectedVersion}
        sidebarCollapsed={sidebarCollapsed}
      />

      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar
          collapsed={sidebarCollapsed}
          project={project}
          selectedModelURI={projectState.selectedModelURI}
          selectedVersion={selectedVersion}
        />

        <div
          className={cn(
            "flex-1 flex flex-col p-2 bg-secondary border-t overflow-hidden",
            !sidebarCollapsed && "border-l rounded-tl-lg",
          )}
        >
          <div className="flex-1 flex flex-col relative">
            <AppView
              app={project}
              className="rounded-lg overflow-hidden"
              isPrimary={!selectedVersion}
              showSendToChat
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

      <ProjectDeleteDialog
        onOpenChange={setShowDeleteDialog}
        open={showDeleteDialog}
        project={project}
      />
    </div>
  );
}
