import { type AppDir } from "../../schemas/paths";
import {
  type PreviewSubdomain,
  type ProjectSubdomain,
  type SandboxSubdomain,
  type VersionSubdomain,
} from "../../schemas/subdomains";
import { type WorkspaceConfig } from "../../types";

export type AppConfig =
  | AppConfigPreview
  | AppConfigProject
  | AppConfigSandbox
  | AppConfigVersion;

export type AppConfigPreview = AppConfigBase & {
  subdomain: PreviewSubdomain;
  type: "preview";
};

export type AppConfigProject = AppConfigBase & {
  subdomain: ProjectSubdomain;
  type: "project";
};

export type AppConfigVersion = AppConfigBase & {
  subdomain: VersionSubdomain;
  type: "version";
};

interface AppConfigBase {
  appDir: AppDir;
  folderName: string;
  workspaceConfig: WorkspaceConfig;
}

type AppConfigSandbox = AppConfigBase & {
  subdomain: SandboxSubdomain;
  type: "sandbox";
};
