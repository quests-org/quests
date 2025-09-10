import { call } from "@orpc/server";
import { z } from "zod";

import { getApp } from "../../../lib/get-apps";
import { AppSubdomainSchema } from "../../../schemas/subdomains";
import { base, toORPCError } from "../../base";
import { publisher } from "../../publisher";
import { appState } from "./state";

const bySubdomain = base
  .input(z.object({ subdomain: AppSubdomainSchema }))
  .handler(async ({ context, errors, input }) => {
    const result = await getApp(input.subdomain, context.workspaceConfig);
    if (result.isErr()) {
      throw toORPCError(result.error, errors);
    }

    return result.value;
  });

const live = {
  bySubdomain: base
    .input(z.object({ subdomain: AppSubdomainSchema }))
    .handler(async function* ({ context, input, signal }) {
      yield call(bySubdomain, input, { context, signal });

      for await (const payload of publisher.subscribe("project.updated", {
        signal,
      })) {
        if (payload.subdomain === input.subdomain) {
          yield call(bySubdomain, input, { context, signal });
        }
      }
    }),
};

export const app = {
  bySubdomain,
  live,
  state: appState,
};
