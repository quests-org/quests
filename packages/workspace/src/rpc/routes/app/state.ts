import { call, eventIterator } from "@orpc/server";
import { isEqual } from "radashi";
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

    const getOrThrow = async () => {
      const result = await getWorkspaceAppState({
        subdomain: input.subdomain,
        workspaceRef,
      });

      if (result.isErr()) {
        throw toORPCError(result.error, errors);
      }

      return result.value;
    };

    let previousState = await getOrThrow();
    yield previousState;

    for await (const _payload of publisher.subscribe(
      "workspaceActor.snapshot",
      { signal },
    )) {
      const currentState = await getOrThrow();

      if (!isEqual(currentState, previousState)) {
        previousState = currentState;
        yield currentState;
      }
    }
  });

const bySubdomains = base
  .input(z.object({ subdomains: AppSubdomainSchema.array() }))
  .output(WorkspaceAppStateSchema.array())
  .handler(async ({ context, errors, input }) => {
    const { workspaceRef } = context;
    const results = [];

    for (const subdomain of input.subdomains) {
      const result = await getWorkspaceAppState({
        subdomain,
        workspaceRef,
      });

      if (result.isErr()) {
        throw toORPCError(result.error, errors);
      }

      results.push(result.value);
    }

    return results;
  });

export const appState = {
  bySubdomain,
  bySubdomains,
  live: {
    bySubdomain,
    bySubdomains: base
      .input(z.object({ subdomains: AppSubdomainSchema.array() }))
      .output(eventIterator(WorkspaceAppStateSchema.array()))
      .handler(async function* ({ context, input, signal }) {
        yield call(bySubdomains, input, { context, signal });

        for await (const _payload of publisher.subscribe(
          "workspaceActor.snapshot",
          { signal },
        )) {
          yield call(bySubdomains, input, { context, signal });
        }
      }),
  },
};
