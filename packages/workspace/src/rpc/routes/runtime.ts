import { z } from "zod";

import { AppSubdomainSchema } from "../../schemas/subdomains";
import { base } from "../base";

const restart = base
  .input(
    z.object({
      appSubdomain: AppSubdomainSchema,
    }),
  )
  .handler(({ context, input }) => {
    context.workspaceRef.send({
      type: "restartRuntime",
      value: {
        subdomain: input.appSubdomain,
      },
    });
  });

export const runtime = {
  restart,
};
