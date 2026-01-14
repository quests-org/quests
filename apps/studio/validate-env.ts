import { defineConfig } from "@julr/vite-plugin-validate-env";
import { z } from "zod";

export default defineConfig({
  // Due to this env being used in Node, only use strings and string enums
  schema: {
    // MAIN_VITE_ prefix is available in the electron-main process
    MAIN_VITE_GOOGLE_CLIENT_ID: z.string().optional(),
    MAIN_VITE_GOOGLE_CLIENT_SECRET: z.string().optional(),
    MAIN_VITE_QUESTS_API_BASE_URL: z
      .string()
      .optional()
      .default("http://localhost:4176"),
    MAIN_VITE_QUESTS_REGISTRY_DIR_PATH: z.string().optional(),
    // VITE_ prefix is available in all processes
    VITE_DEBUG_TELEMETRY: z.enum(["true", "false"]).default("false"),
    VITE_POSTHOG_API_HOST: z.string().optional(),
    VITE_POSTHOG_API_KEY: z.string().optional(),
  },
  validator: "standard",
});
