import { eventIterator } from "@orpc/server";
import { z } from "zod";

import { getWorkspaceAppState } from "../../../lib/get-workspace-app-state";
import { WorkspaceAppStateSchema } from "../../../schemas/app-state";
import { AppSubdomainSchema } from "../../../schemas/subdomains";
import { base, toORPCError } from "../../base";
import { publisher } from "../../publisher";

const bySubdomain = base
  .input(z.object({ subdomain: AppSubdomainSchema }))
  .output(eventIterator(WorkspaceAppStateSchema))
  .handler(async function* ({ context, errors, input, signal }) {
    const { workspaceRef } = context;

    const getOrThrow = () => {
      const result = getWorkspaceAppState({
        subdomain: input.subdomain,
        workspaceRef,
      });

      if (result.isErr()) {
        throw toORPCError(result.error, errors);
      }

      return result.value;
    };

    yield getOrThrow();

    for await (const _payload of publisher.subscribe(
      "workspaceActor.snapshot",
      { signal },
    )) {
      yield getOrThrow();
    }
  });

export const appState = {
  live: {
    bySubdomain,
  },
};
