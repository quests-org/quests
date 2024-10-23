import { logger } from "@/electron-main/lib/electron-logger";
import { publisher } from "@/electron-main/rpc/publisher";
import { ProjectSubdomainSchema } from "@quests/workspace/client";
import { workspacePublisher } from "@quests/workspace/electron";
import Store from "electron-store";
import { unique } from "radashi";
import { z } from "zod";

const FavoritesSchema = z.object({
  // eslint-disable-next-line unicorn/prefer-top-level-await
  favorites: z.array(ProjectSubdomainSchema).catch([]),
});

type FavoritesState = z.output<typeof FavoritesSchema>;

let FAVORITES_STORE: null | Store<FavoritesState> = null;

export const getFavoritesStore = (): Store<FavoritesState> => {
  if (FAVORITES_STORE === null) {
    const defaultFavorites = FavoritesSchema.parse({});
    FAVORITES_STORE = new Store<FavoritesState>({
      defaults: defaultFavorites,
      deserialize: (value) => {
        const parsed = FavoritesSchema.safeParse(JSON.parse(value));

        if (parsed.success) {
          return parsed.data;
        }

        logger.error("Failed to parse preferences state", parsed.error);

        return defaultFavorites;
      },

      name: "favorites",
    });

    FAVORITES_STORE.onDidChange("favorites", () => {
      publisher.publish("favorites.updated", null);
    });

    workspacePublisher.subscribe(
      "project.quest-manifest-updated",
      (payload) => {
        if (!payload.isFavorite) {
          return;
        }
        const favoritesStore = getFavoritesStore();
        const favorites = favoritesStore.get("favorites");
        const updatedFavorites = unique([...favorites, payload.subdomain]);
        favoritesStore.set("favorites", updatedFavorites);
      },
    );

    workspacePublisher.subscribe("project.removed", (payload) => {
      const favoritesStore = getFavoritesStore();
      const favorites = favoritesStore.get("favorites");
      favoritesStore.set(
        "favorites",
        favorites.filter((subdomain) => subdomain !== payload.subdomain),
      );
    });
  }

  return FAVORITES_STORE;
};
