import { type CheckoutVersionActorRef } from "../../logic/checkout-version";
import { type CreatePreviewActorRef } from "../../logic/create-preview";
import { type WorkspaceServerActorRef } from "../../logic/server";
import {
  type AppSubdomain,
  type PreviewSubdomain,
  type VersionSubdomain,
} from "../../schemas/subdomains";
import { type RunPackageJsonScript, type WorkspaceConfig } from "../../types";
import { type RuntimeActorRef } from "../runtime";
import { type SessionActorRef } from "../session";

// Declared here to avoid circular dependency
export interface WorkspaceContext {
  appsBeingTrashed: AppSubdomain[];
  checkoutVersionRefs: Map<VersionSubdomain, CheckoutVersionActorRef>;
  config: WorkspaceConfig;
  createPreviewRefs: Map<PreviewSubdomain, CreatePreviewActorRef>;
  error?: unknown;
  runPackageJsonScript: RunPackageJsonScript;
  runtimeRefs: Map<AppSubdomain, RuntimeActorRef>;
  sessionRefsBySubdomain: Map<AppSubdomain, SessionActorRef[]>;
  workspaceServerRef: WorkspaceServerActorRef;
}
