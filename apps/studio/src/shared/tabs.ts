import { type ProjectMode } from "@quests/shared";
import { type IconName } from "@quests/shared/icons";

export interface Tab {
  background?: string;
  icon?: IconName;
  id: string;
  pathname: string;
  pinned?: boolean;
  projectMode?: ProjectMode;
  title?: string;
}

export interface TabState {
  selectedTabId: null | string;
  tabs: Tab[];
}

export const SingleTabOnlyRoutes = /\/projects\/[^/]+|\/login/;

export const META_TAG_LUCIDE_ICON = "lucide-icon";
export const META_TAG_ICON_BACKGROUND = "icon-background";
export const META_TAG_PROJECT_MODE = "project-mode";
