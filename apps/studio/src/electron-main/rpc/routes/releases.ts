import { base } from "@/electron-main/rpc/base";
import { APP_REPO_NAME, GITHUB_ORG } from "@quests/shared";
import ms from "ms";
import { z } from "zod";

import { cacheMiddleware } from "../middleware/cache";

const ReleaseSchema = z.object({
  body: z.string().nullable(),
  created_at: z.string(),
  draft: z.boolean(),
  html_url: z.string(),
  id: z.number(),
  name: z.string().nullable(),
  prerelease: z.boolean(),
  published_at: z.string().nullable(),
  tag_name: z.string(),
});

const ReleasesResponseSchema = z.object({
  hasMore: z.boolean(),
  releases: z.array(ReleaseSchema),
});

const list = base
  .use(async ({ next }) => {
    return next({
      context: {
        cacheTTL: ms("5 minutes"),
      },
    });
  })
  .use(cacheMiddleware)
  .errors({
    FETCH_ERROR: {
      message: "Failed to fetch releases from GitHub",
    },
    PARSE_ERROR: {
      message: "Failed to parse GitHub API response",
    },
  })
  .output(ReleasesResponseSchema)
  .handler(async ({ errors }) => {
    try {
      const apiUrl = `https://api.github.com/repos/${GITHUB_ORG}/${APP_REPO_NAME}/releases?per_page=30`;

      const response = await fetch(apiUrl, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Quests.dev",
        },
      });

      if (!response.ok) {
        throw new Error(
          `GitHub API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as unknown;
      const linkHeader = response.headers.get("Link");

      const releases = z.array(ReleaseSchema).parse(data);
      const filteredReleases = releases.filter(
        (release) => !release.draft && !release.prerelease,
      );

      const hasMore = linkHeader?.includes('rel="next"') ?? false;

      return {
        hasMore,
        releases: filteredReleases,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw errors.PARSE_ERROR({
          message: `Invalid GitHub API response format: ${error.message}`,
        });
      }

      throw errors.FETCH_ERROR({
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

export const releases = {
  list,
};
