import { workspaceRouter } from "@quests/workspace/electron";

import { api } from "./api";
import { appState } from "./app-state";
import { auth } from "./auth";
import { debug } from "./debug";
import { evals } from "./evals";
import { favorites } from "./favorites";
import { gateway } from "./gateway";
import { icon } from "./icon";
import { preferences } from "./preferences";
import { provider } from "./provider";
import { releases } from "./releases";
import { sidebar } from "./sidebar";
import { tabs } from "./tabs";
import { telemetry } from "./telemetry";
import { toolbar } from "./toolbar";
import { updates } from "./updates";
import { user } from "./user";
import { utils } from "./utils";

export const router = {
  api,
  appState,
  auth,
  debug,
  evals,
  favorites,
  gateway,
  icon,
  preferences,
  provider,
  releases,
  sidebar,
  tabs,
  telemetry,
  toolbar,
  updates,
  user,
  utils,
  workspace: workspaceRouter,
};
