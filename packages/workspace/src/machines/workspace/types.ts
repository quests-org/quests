import { type CheckoutVersionActorRef } from "../../logic/checkout-version";
import { type CreatePreviewActorRef } from "../../logic/create-preview";
import { type WorkspaceServerActorRef } from "../../logic/server";
import { type StoreId } from "../../schemas/store-id";
import {
  type AppSubdomain,
  type PreviewSubdomain,
  type VersionSubdomain,
} from "../../schemas/subdomains";
import { type WorkspaceConfig } from "../../types";
import { type RuntimeActorRef } from "../runtime";
import { type SessionActorRef } from "../session";

// Declared here to avoid circular dependency
export interface WorkspaceContext {
  appsBeingTrashed: AppSubdomain[];
  checkoutVersionRefs: Map<VersionSubdomain, CheckoutVersionActorRef>;
  config: WorkspaceConfig;
  createPreviewRefs: Map<PreviewSubdomain, CreatePreviewActorRef>;
  error?: unknown;
  runtimeRefs: Map<AppSubdomain, RuntimeActorRef>;
  sessionObservers: Map<StoreId.Session, () => void>;
  sessionRefsBySubdomain: Map<AppSubdomain, SessionActorRef[]>;
  workspaceServerRef: WorkspaceServerActorRef;
}
