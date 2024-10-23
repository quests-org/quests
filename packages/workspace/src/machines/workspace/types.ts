import { type CheckoutVersionActorRef } from "../../logic/checkout-version";
import { type CreatePreviewActorRef } from "../../logic/create-preview";
import { type WorkspaceServerActorRef } from "../../logic/server";
import { type AbsolutePath } from "../../schemas/paths";
import {
  type AppSubdomain,
  type PreviewSubdomain,
  type VersionSubdomain,
} from "../../schemas/subdomains";
import { type RunPackageJsonScript, type WorkspaceConfig } from "../../types";
import { type AppEventActorRef } from "../app-event";
import { type RuntimeActorRef } from "../runtime";
import { type SessionActorRef } from "../session";

// Declared here to avoid circular dependency
export interface WorkspaceContext {
  appEventRef: AppEventActorRef;
  checkoutVersionRefs: Map<VersionSubdomain, CheckoutVersionActorRef>;
  config: WorkspaceConfig;
  createPreviewRefs: Map<PreviewSubdomain, CreatePreviewActorRef>;
  error?: unknown;
  runPackageJsonScript: RunPackageJsonScript;
  runtimeRefs: Map<AppSubdomain, RuntimeActorRef>;
  sessionRefsBySubdomain: Map<AppSubdomain, SessionActorRef[]>;
  shimServerJSPath: AbsolutePath;
  workspaceServerRef: WorkspaceServerActorRef;
}
