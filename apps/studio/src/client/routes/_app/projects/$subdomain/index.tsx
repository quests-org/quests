import { promptValueAtomFamily } from "@/client/atoms/prompt-value";
import { DuplicateProjectModal } from "@/client/components/duplicate-project-modal";
import { ProjectDeleteDialog } from "@/client/components/project-delete-dialog";
import { ProjectSettingsDialog } from "@/client/components/project-settings-dialog";
import { ProjectView } from "@/client/components/project-view";
import { useProjectRouteSync } from "@/client/hooks/use-project-route-sync";
import { rpcClient } from "@/client/rpc/client";
import { artifactPanelSchema } from "@/client/schemas/artifact-panel";
import { createIconMeta, createProjectSubdomainMeta } from "@/shared/tabs";
import { safe } from "@orpc/client";
import {
  type ProjectSubdomain,
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
import { useEffect, useRef } from "react";
import { z } from "zod";

const projectSearchSchema = z.object({
  artifactPanel: artifactPanelSchema.optional(),
  chatOpen: z.boolean().optional(),
  explorerOpen: z.boolean().optional(),
  selectedSessionId: StoreId.SessionSchema.optional(),
  showDelete: z.boolean().optional(),
  showDuplicate: z.boolean().optional(),
  showSettings: z.boolean().optional(),
  showVersions: z.boolean().optional(),
});

// No known lifecycle method in TanStack Router to track when the param changes
// so we do it with a global variable.
let LAST_SUBDOMAIN: ProjectSubdomain | undefined;

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
  beforeLoad: async ({ cause, params, search }) => {
    const isProjectSwitch = params.subdomain !== LAST_SUBDOMAIN;
    LAST_SUBDOMAIN = params.subdomain;

    const needsSessionDefault = !search.selectedSessionId;
    const needsArtifactPanelDefault =
      (cause === "enter" || isProjectSwitch) && !search.artifactPanel;

    const [sessionError, sessions, isDefined] = needsSessionDefault
      ? await safe(
          rpcClient.workspace.session.list.call({
            subdomain: params.subdomain,
          }),
        )
      : ([null, [], false] as const);

    if (sessionError) {
      if (isDefined && sessionError.code === "NOT_FOUND") {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw notFound();
      }
      // Allow route to load if not defined or not a NOT_FOUND error
      return;
    }

    const newestSession = sessions.at(-1);

    const [, hasModifications] = needsArtifactPanelDefault
      ? await safe(
          rpcClient.workspace.project.git.hasAppModifications.call({
            projectSubdomain: params.subdomain,
          }),
        )
      : ([null, false] as const);

    // On the lg breakpoint, the explorer floats and covers content. So we close
    // it by default if the route is loaded when it would float.
    const isFloatingScreen = window.innerWidth < 1024;
    const shouldCloseExplorer =
      (cause === "enter" || isProjectSwitch) &&
      isFloatingScreen &&
      search.explorerOpen !== false &&
      Boolean(search.artifactPanel);

    if (
      newestSession ||
      (hasModifications && needsArtifactPanelDefault) ||
      shouldCloseExplorer
    ) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({
        params: { subdomain: params.subdomain },
        search: (prev) => ({
          ...prev,
          ...(newestSession ? { selectedSessionId: newestSession.id } : {}),
          ...(hasModifications && needsArtifactPanelDefault
            ? { artifactPanel: { type: "app" } }
            : {}),
          ...(shouldCloseExplorer ? { explorerOpen: false } : {}),
        }),
        to: "/projects/$subdomain",
      });
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
    artifactPanel,
    chatOpen,
    explorerOpen,
    selectedSessionId,
    showDelete,
    showDuplicate,
    showSettings,
    showVersions,
  } = Route.useSearch();
  const navigate = useNavigate();

  const handleDeleteDialogChange = (open: boolean) => {
    if (showDelete && !open) {
      // Don't navigate when closing delete dialog - navigation will be handled by deletion
      return;
    }
    void navigate({
      from: "/projects/$subdomain",
      params: { subdomain },
      replace: true,
      search: (prev) => ({ ...prev, showDelete: open || undefined }),
    });
  };

  const handleDuplicateDialogChange = (open: boolean) => {
    void navigate({
      from: "/projects/$subdomain",
      params: { subdomain },
      replace: true,
      search: (prev) => ({ ...prev, showDuplicate: open || undefined }),
    });
  };

  const handleSettingsDialogChange = (open: boolean) => {
    void navigate({
      from: "/projects/$subdomain",
      params: { subdomain },
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

  const { data: hasAppModifications } = useQuery(
    rpcClient.workspace.project.git.live.hasAppModifications.experimental_liveOptions(
      {
        input: { projectSubdomain: subdomain },
        placeholderData: keepPreviousData,
      },
    ),
  );

  const { data: files } = useQuery(
    rpcClient.workspace.project.git.live.listFiles.experimental_liveOptions({
      input: { projectSubdomain: subdomain },
      placeholderData: keepPreviousData,
    }),
  );

  // Tracks the settled (post-load) value. Stays undefined until the query resolves
  // for the first time, so we don't treat undefined→true as a live transition.
  const settledHasAppModificationsRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (hasAppModifications === undefined) {
      return;
    }

    const prev = settledHasAppModificationsRef.current;
    settledHasAppModificationsRef.current = hasAppModifications;

    // Only navigate when transitioning from false to true after initial load
    if (
      prev === false &&
      hasAppModifications &&
      artifactPanel?.type !== "app"
    ) {
      void navigate({
        from: "/projects/$subdomain",
        params: { subdomain },
        replace: true,
        search: (s) => ({ ...s, artifactPanel: { type: "app" } }),
      });
    }
  }, [hasAppModifications, artifactPanel, navigate, subdomain]);

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
    <>
      <ProjectView
        artifactPanel={artifactPanel}
        attachedFolders={projectState.attachedFolders}
        chatOpen={chatOpen ?? true}
        explorerOpen={explorerOpen}
        files={files}
        hasAppModifications={hasAppModifications ?? false}
        project={project}
        selectedModelURI={projectState.selectedModelURI}
        selectedSessionId={selectedSessionId}
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
        project={project}
      />

      <ProjectSettingsDialog
        onOpenChange={handleSettingsDialogChange}
        open={showSettings ?? false}
        project={project}
      />
    </>
  );
}
