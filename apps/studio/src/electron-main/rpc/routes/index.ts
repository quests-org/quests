import { workspaceRouter } from "@quests/workspace/electron";

import { appState } from "./app-state";
import { auth } from "./auth";
import { debug } from "./debug";
import { evals } from "./evals";
import { favorites } from "./favorites";
import { features } from "./features";
import { gateway } from "./gateway";
import { plans } from "./plans";
import { preferences } from "./preferences";
import { providerConfig } from "./provider-config";
import { releases } from "./releases";
import { sidebar } from "./sidebar";
import { stripe } from "./stripe";
import { tabs } from "./tabs";
import { telemetry } from "./telemetry";
import { updates } from "./updates";
import { user } from "./user";
import { utils } from "./utils";

export const router = {
  appState,
  auth,
  debug,
  evals,
  favorites,
  features,
  gateway,
  plans,
  preferences,
  providerConfig,
  releases,
  sidebar,
  stripe,
  tabs,
  telemetry,
  updates,
  user,
  utils,
  workspace: workspaceRouter,
};
