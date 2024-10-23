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

      if (favoriteProjectsThatExist.length !== subdomains.length) {
        favoritesStore.set(
          "favorites",
          favoriteProjectsThatExist.map((p) => p.subdomain),
        );
      }

      return favoriteProjectsThatExist;
    };

    const favorites = favoritesStore.get("favorites");
    yield await fetchAndCleanFavorites(favorites);

    const projectUpdates = workspacePublisher.subscribe("project.updated", {
      signal,
    });
    const projectQuestManifestUpdates = workspacePublisher.subscribe(
      "project.quest-manifest-updated",
      { signal },
    );
    const projectRemoved = workspacePublisher.subscribe("project.removed", {
      signal,
    });
    const favoritesUpdated = publisher.subscribe("favorites.updated", {
      signal,
    });

    for await (const _payload of mergeGenerators([
      projectUpdates,
      projectQuestManifestUpdates,
      projectRemoved,
      favoritesUpdated,
    ])) {
      const favoritesNext = favoritesStore.get("favorites");
      yield await fetchAndCleanFavorites(favoritesNext);
    }
  }),
};

export const favorites = {
  live,
  remove,
};
