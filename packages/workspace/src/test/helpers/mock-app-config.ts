import { createAppConfig } from "../../lib/app-config/create";
import { AbsolutePathSchema, WorkspaceDirSchema } from "../../schemas/paths";
import { type AppSubdomain } from "../../schemas/subdomains";

const MOCK_WORKSPACE_DIR = "/tmp/workspace";

export const MOCK_WORKSPACE_DIRS = {
  previews: `${MOCK_WORKSPACE_DIR}/previews`,
  projects: `${MOCK_WORKSPACE_DIR}/projects`,
  registry: `${MOCK_WORKSPACE_DIR}/registry`,
} as const;

export function createMockAppConfig(subdomain: AppSubdomain) {
  return createAppConfig({
    subdomain,
    workspaceConfig: {
      captureEvent: () => {
        // No-op
      },
      captureException: (...args: unknown[]) => {
        // eslint-disable-next-line no-console
        console.error("captureException", args);
      },
      getAIProviders: () => [],
      pnpmBinPath: AbsolutePathSchema.parse("/tmp/pnpm"),
      previewsDir: AbsolutePathSchema.parse(MOCK_WORKSPACE_DIRS.previews),
      projectsDir: AbsolutePathSchema.parse(MOCK_WORKSPACE_DIRS.projects),
      registryDir: AbsolutePathSchema.parse(MOCK_WORKSPACE_DIRS.registry),
      rootDir: WorkspaceDirSchema.parse(MOCK_WORKSPACE_DIR),
      trashItem: () => Promise.resolve(),
    },
  });
}
