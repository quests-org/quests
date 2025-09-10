import { ProjectSubdomainSchema } from "@quests/workspace/client";
import { createFileRoute, redirect } from "@tanstack/react-router";

// View route has been removed as of2025-09-10
// TODO: Remove this migration after 2025-10-10

/* eslint-disable perfectionist/sort-objects */
export const Route = createFileRoute("/_app/projects/$subdomain/view")({
  // Must come before component for type inference
  params: {
    parse: (rawParams) => {
      return {
        subdomain: ProjectSubdomainSchema.parse(rawParams.subdomain),
      };
    },
  },
  loader: ({ params }) => {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw redirect({
      params: {
        subdomain: params.subdomain,
      },
      to: "/projects/$subdomain",
    });
  },
});
/* eslint-enable perfectionist/sort-objects */
