import { migrateProjectSubdomain } from "@/client/lib/migrate-project-subdomain";
import { base } from "@/electron-main/rpc/base";
import { publisher } from "@/electron-main/rpc/publisher";
import { getFavoritesStore } from "@/electron-main/stores/favorites";
import { call } from "@orpc/server";
import { mergeGenerators } from "@quests/shared/merge-generators";
import { ProjectSubdomainSchema } from "@quests/workspace/client";
import {
  type ProjectSubdomain,
  workspacePublisher,
  workspaceRouter,
} from "@quests/workspace/electron";
import { z } from "zod";

const add = base
  .input(
    z.object({
      subdomain: ProjectSubdomainSchema,
    }),
  )
  .output(z.void())
  .handler(({ context, input }) => {
    const favoritesStore = getFavoritesStore();
    const favorites = favoritesStore.get("favorites");
    if (!favorites.includes(input.subdomain)) {
      const updatedFavorites = [...favorites, input.subdomain];
      favoritesStore.set("favorites", updatedFavorites);
    }
    context.workspaceConfig.captureEvent("favorite.added");
  });

const remove = base
  .input(
    z.object({
      subdomain: ProjectSubdomainSchema,
    }),
  )
  .output(z.void())
  .handler(({ context, input }) => {
    const favoritesStore = getFavoritesStore();
    const favorites = favoritesStore.get("favorites");
    const updatedFavorites = favorites.filter((app) => app !== input.subdomain);
    favoritesStore.set("favorites", updatedFavorites);
    context.workspaceConfig.captureEvent("favorite.removed");
  });

const live = {
  listProjects: base.handler(async function* ({ context, signal }) {
    const favoritesStore = getFavoritesStore();

    const fetchAndCleanFavorites = async (subdomains: ProjectSubdomain[]) => {
      const results = await call(
        workspaceRouter.project.bySubdomains,
        { subdomains },
        { context, signal },
      );

      const favoriteProjectsThatExist = results
        .filter((r) => r.ok)
        .map((r) => r.data);

      // Check for missing projects - try migration for each missing one
      const missingSubdomains = subdomains.filter(
        (subdomain) =>
          !favoriteProjectsThatExist.some((p) => p.subdomain === subdomain),
      );

      const migratedProjects: typeof favoriteProjectsThatExist = [];
      let hasMigrations = false;

      if (missingSubdomains.length > 0) {
        const migrationCandidates = missingSubdomains
          .map((subdomain) => migrateProjectSubdomain(subdomain))
          .filter((migration) => migration.didMigrate)
          .map((migration) => migration.subdomain);

        if (migrationCandidates.length > 0) {
          hasMigrations = true;
          const migrationResults = await call(
            workspaceRouter.project.bySubdomains,
            { subdomains: migrationCandidates },
            { context, signal },
          );

          migratedProjects.push(
            ...migrationResults.filter((r) => r.ok).map((r) => r.data),
          );
        }
      }

      const allFoundProjects = [
        ...favoriteProjectsThatExist,
        ...migratedProjects,
      ];

      if (allFoundProjects.length !== subdomains.length || hasMigrations) {
        favoritesStore.set(
          "favorites",
          allFoundProjects.map((p) => p.subdomain),
        );
      }

      return allFoundProjects;
    };

    const favorites = favoritesStore.get("favorites");
    yield await fetchAndCleanFavorites(favorites);

    const projectUpdates = workspacePublisher.subscribe("project.updated", {
      signal,
    });
    const projectRemoved = workspacePublisher.subscribe("project.removed", {
      signal,
    });
    const favoritesUpdated = publisher.subscribe("favorites.updated", {
      signal,
    });

    for await (const _payload of mergeGenerators([
      projectUpdates,
      projectRemoved,
      favoritesUpdated,
    ])) {
      const favoritesNext = favoritesStore.get("favorites");
      yield await fetchAndCleanFavorites(favoritesNext);
    }
  }),
};

export const favorites = {
  add,
  live,
  remove,
};
