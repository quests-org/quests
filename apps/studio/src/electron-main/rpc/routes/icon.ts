import { base } from "@/electron-main/rpc/base";
import { DEFAULT_THEME_GRADIENT, THEMES } from "@quests/shared/icons";

const randomTheme = base.handler(() => {
  const idx = Math.floor(Math.random() * THEMES.length);
  const theme = THEMES[idx];
  return { theme: theme ?? DEFAULT_THEME_GRADIENT };
});

export const icon = {
  randomTheme,
};
