import { type ProjectSubdomain } from "@quests/workspace/client";
import { atom } from "jotai";
import { atomFamily } from "jotai/utils";

export const projectSidebarCollapsedAtomFamily = atomFamily(
  (_subdomain: ProjectSubdomain) => atom(false),
);

export const projectFilesPanelCollapsedAtomFamily = atomFamily(
  (_subdomain: ProjectSubdomain) => atom(false),
);
