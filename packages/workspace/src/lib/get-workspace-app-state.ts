import { ok } from "neverthrow";

import { type WorkspaceActorRef } from "../machines/workspace";
import { type SessionTag, type WorkspaceAppState } from "../schemas/app-state";
import { type AppSubdomain } from "../schemas/subdomains";
import { getWorkspaceAppForSubdomain } from "./get-workspace-app-for-subdomain";

export async function getWorkspaceAppState({
  subdomain,
  workspaceRef,
}: {
  subdomain: AppSubdomain;
  workspaceRef: WorkspaceActorRef;
}) {
  const snapshot = workspaceRef.getSnapshot();
  const context = snapshot.context;

  const app = await getWorkspaceAppForSubdomain(subdomain, context.config);

  const sessionRefs = context.sessionRefsBySubdomain.get(subdomain) ?? [];
  const sessionActors = sessionRefs.map((sessionRef) => {
    const sessionSnapshot = sessionRef.getSnapshot();
    return {
      sessionId: sessionSnapshot.context.sessionId,
      // Casting shouldn't be necessary, but only .hasTag() accept proper types
      tags: [...sessionSnapshot.tags] as SessionTag[],
    };
  });

  const workspaceAppState: WorkspaceAppState = {
    app,
    checkoutVersionRefActor: { status: "does-not-exist" },
    createPreviewRefActor: { status: "does-not-exist" },
    sessionActors,
  };

  if (workspaceAppState.app.type === "version") {
    const checkoutVersionRef = context.checkoutVersionRefs.get(
      workspaceAppState.app.subdomain,
    );
    if (checkoutVersionRef) {
      const checkoutSnapshot = checkoutVersionRef.getSnapshot();
      workspaceAppState.checkoutVersionRefActor = {
        status: checkoutSnapshot.status,
      };
    }
  }

  if (workspaceAppState.app.type === "preview") {
    const createPreviewRef = context.createPreviewRefs.get(
      workspaceAppState.app.subdomain,
    );
    if (createPreviewRef) {
      const previewSnapshot = createPreviewRef.getSnapshot();
      workspaceAppState.createPreviewRefActor = {
        status: previewSnapshot.status,
      };
    }
  }

  return ok(workspaceAppState);
}
