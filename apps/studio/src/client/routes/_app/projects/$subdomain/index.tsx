import { promptValueAtomFamily } from "@/client/atoms/prompt-value";
import { DuplicateProjectModal } from "@/client/components/duplicate-project-modal";
import { ProjectDeleteDialog } from "@/client/components/project-delete-dialog";
import { ProjectSettingsDialog } from "@/client/components/project-settings-dialog";
import { ProjectView } from "@/client/components/project-view";
import { useProjectRouteSync } from "@/client/hooks/use-project-route-sync";
import { migrateProjectSubdomain } from "@/client/lib/migrate-project-subdomain";
import { rpcClient } from "@/client/rpc/client";
import { createIconMeta, createProjectSubdomainMeta } from "@/shared/tabs";
import { safe } from "@orpc/client";
import {
  ProjectSubdomainSchema,
  StoreId,
  type WorkspaceAppProject,
} from "@quests/workspace/client";
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
import { z } from "zod";

const projectSearchSchema = z.object({
  selectedSessionId: StoreId.SessionSchema.optional(),
  selectedVersion: z.string().optional(),
  showDelete: z.boolean().optional(),
  showDuplicate: z.boolean().optional(),
  showSettings: z.boolean().optional(),
  showVersions: z.boolean().optional(),
});

function title(project?: WorkspaceAppProject) {
  return project?.title ?? "Not Found";
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
  context: () => ({
    disableHotkeyReload: true,
  }),
  onLeave: ({ params }) => {
    // Garbage collect project atoms
    promptValueAtomFamily.remove(params.subdomain);
  },
  beforeLoad: async ({ params, search }) => {
    const [error, sessions, isDefined] = await safe(
      rpcClient.workspace.session.list.call({
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
      // Allow route to load if not defined or not a NOT_FOUND error
      return;
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
      rpcClient.workspace.project.bySubdomain.call({
        subdomain: params.subdomain,
      }),
    );

    return {
      meta: [
        {
          title: title(project.data),
        },
        ...(project.data?.iconName
          ? [createIconMeta(project.data.iconName)]
          : [createIconMeta("message-circle")]),
        createProjectSubdomainMeta(params.subdomain),
      ],
    };
  },
  validateSearch: projectSearchSchema,
});
/* eslint-enable perfectionist/sort-objects */

function RouteComponent() {
  const { subdomain } = Route.useParams();
  const {
    selectedSessionId,
    selectedVersion,
    showDelete,
    showDuplicate,
    showSettings,
    showVersions,
  } = Route.useSearch();
  const navigate = useNavigate();

  const handleDeleteDialogChange = (open: boolean) => {
    void navigate({
      from: "/projects/$subdomain",
      params: {
        subdomain,
      },
      replace: true,
      search: (prev) => ({ ...prev, showDelete: open || undefined }),
    });
  };

  const handleDuplicateDialogChange = (open: boolean) => {
    void navigate({
      from: "/projects/$subdomain",
      params: {
        subdomain,
      },
      replace: true,
      search: (prev) => ({ ...prev, showDuplicate: open || undefined }),
    });
  };

  const handleSettingsDialogChange = (open: boolean) => {
    void navigate({
      from: "/projects/$subdomain",
      params: {
        subdomain,
      },
      replace: true,
      search: (prev) => ({ ...prev, showSettings: open || undefined }),
    });
  };

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

  useProjectRouteSync(project);

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

  const {
    data: hasAppModifications = true,
    isLoading: isAppModificationsLoading,
  } = useQuery(
    rpcClient.workspace.project.git.hasAppModifications.live.check.experimental_liveOptions(
      {
        input: { projectSubdomain: subdomain },
      },
    ),
  );

  const isLoading =
    isProjectLoading || isProjectStateLoading || isAppModificationsLoading;
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
    <>
      <ProjectView
        hasAppModifications={hasAppModifications}
        project={project}
        selectedModelURI={projectState.selectedModelURI}
        selectedSessionId={selectedSessionId}
        selectedVersion={selectedVersion}
        showVersions={showVersions}
      />

      <ProjectDeleteDialog
        navigateOnDelete
        onOpenChange={handleDeleteDialogChange}
        open={showDelete ?? false}
        project={project}
      />

      <DuplicateProjectModal
        isOpen={showDuplicate ?? false}
        onClose={() => {
          handleDuplicateDialogChange(false);
        }}
        projectName={project.title}
        projectSubdomain={project.subdomain}
      />

      <ProjectSettingsDialog
        onOpenChange={handleSettingsDialogChange}
        open={showSettings ?? false}
        project={project}
      />
    </>
  );
}
