import { z } from "zod";

import { getApp } from "../../../lib/get-apps";
import { AppSubdomainSchema } from "../../../schemas/subdomains";
import { base, toORPCError } from "../../base";
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

export const app = {
  bySubdomain,
  state: appState,
};
