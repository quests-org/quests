import { defineConfig } from "@julr/vite-plugin-validate-env";
import { z } from "zod";

export default defineConfig({
  // Due to this env being used in Node, only use strings and string enums
  schema: {
    MAIN_VITE_GOOGLE_CLIENT_ID: z.string().optional(),
    MAIN_VITE_GOOGLE_CLIENT_SECRET: z.string().optional(),
    MAIN_VITE_QUESTS_OPEN_ROUTER_BASE_URL: z.string().optional(),
    VITE_APP_PROTOCOL: z.string().optional(),
    VITE_DEBUG_TELEMETRY: z.enum(["true", "false"]).default("false"),
    VITE_POSTHOG_API_HOST: z.string().optional(),
    VITE_POSTHOG_API_KEY: z.string().optional(),
    VITE_QUESTS_API_BASE_URL: z.string().optional(),
  },
  validator: "standard",
});
