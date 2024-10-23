import { err, ok, type Result, safeTry } from "neverthrow";

import {
  type WorkspaceApp,
  type WorkspaceAppPreview,
  type WorkspaceAppProject,
  type WorkspaceAppSandbox,
  type WorkspaceAppVersion,
} from "../schemas/app";
import {
  type AppSubdomain,
  type PreviewSubdomain,
  PreviewSubdomainSchema,
  type ProjectSubdomain,
  ProjectSubdomainSchema,
  type SandboxSubdomain,
  SandboxSubdomainSchema,
  type VersionSubdomain,
  VersionSubdomainSchema,
} from "../schemas/subdomains";
import { folderNameForSubdomain } from "./folder-name-for-subdomain";
import { projectSubdomainForSubdomain } from "./project-subdomain-for-subdomain";
import { localhostUrl, loopbackUrl } from "./url-for-subdomain";

type GetWorkspaceAppResult<T extends AppSubdomain> = T extends PreviewSubdomain
  ? WorkspaceAppPreview
  : T extends ProjectSubdomain
    ? WorkspaceAppProject
    : T extends SandboxSubdomain
      ? WorkspaceAppSandbox
      : T extends VersionSubdomain
        ? WorkspaceAppVersion
        : WorkspaceApp;

export function getWorkspaceAppForSubdomain<T extends AppSubdomain>(
  subdomain: T,
): Result<
  GetWorkspaceAppResult<T>,
  {
    message: string;
    type: "schema-error";
  }
> {
  return safeTry(function* () {
    const folderName = yield* folderNameForSubdomain(subdomain);
    const previewResult = PreviewSubdomainSchema.safeParse(subdomain);
    if (previewResult.success) {
      return ok({
        folderName,
        subdomain: previewResult.data,
        title: folderName,
        type: "preview",
        urls: {
          localhost: localhostUrl(subdomain),
          loopback: loopbackUrl(subdomain),
        },
      } satisfies WorkspaceAppPreview as unknown as GetWorkspaceAppResult<T>);
    }
    const projectResult = ProjectSubdomainSchema.safeParse(subdomain);
    if (projectResult.success) {
      return ok({
        folderName,
        subdomain: projectResult.data,
        title: folderName,
        type: "project",
        urls: {
          localhost: localhostUrl(subdomain),
          loopback: loopbackUrl(subdomain),
        },
      } satisfies WorkspaceAppProject as unknown as GetWorkspaceAppResult<T>);
    }
    const sandboxResult = SandboxSubdomainSchema.safeParse(subdomain);
    if (sandboxResult.success) {
      const project = yield* getWorkspaceAppForSubdomain(
        projectSubdomainForSubdomain(sandboxResult.data),
      );
      return ok({
        folderName,
        project,
        subdomain: sandboxResult.data,
        title: folderName,
        type: "sandbox",
        urls: {
          localhost: localhostUrl(subdomain),
          loopback: loopbackUrl(subdomain),
        },
      } satisfies WorkspaceAppSandbox as unknown as GetWorkspaceAppResult<T>);
    }

    const versionResult = VersionSubdomainSchema.safeParse(subdomain);
    if (versionResult.success) {
      const project = yield* getWorkspaceAppForSubdomain(
        projectSubdomainForSubdomain(versionResult.data),
      );
      return ok({
        folderName,
        project,
        subdomain: versionResult.data,
        title: folderName,
        type: "version",
        urls: {
          localhost: localhostUrl(subdomain),
          loopback: loopbackUrl(subdomain),
        },
      } satisfies WorkspaceAppVersion as unknown as GetWorkspaceAppResult<T>);
    }
    return err({
      message: "Subdomain does not match any known type",
      type: "schema-error" as const,
    });
  });
}
