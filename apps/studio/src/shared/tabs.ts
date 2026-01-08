import { type TabIconName } from "@quests/shared/icons";
import { type ProjectSubdomain } from "@quests/workspace/client";

export interface Tab {
  iconName?: TabIconName;
  id: string;
  pathname: string;
  pinned?: boolean;
  projectSubdomain?: ProjectSubdomain;
  title?: string;
}

export interface TabState {
  selectedTabId: null | string;
  tabs: Tab[];
}

export const SingleTabOnlyRoutes = /\/projects\/[^/]+|\/sign-in/;

export const META_TAGS = {
  iconName: "quests-icon-name",
  projectSubdomain: "quests-project-subdomain",
};

export function createIconMeta(icon: TabIconName) {
  return {
    content: icon,
    name: META_TAGS.iconName,
  };
}

export function createProjectSubdomainMeta(subdomain: ProjectSubdomain) {
  return {
    content: subdomain,
    name: META_TAGS.projectSubdomain,
  };
}
