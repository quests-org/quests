/// <reference types="vite/client" />

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ImportMetaEnv extends ImportMetaEnvAugmented {
  // Now import.meta.env is totally type-safe and based on your `env.ts` schema definition
  // You can also add custom variables that are not defined in your schema
}

type ImportMetaEnvAugmented =
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  import("@julr/vite-plugin-validate-env").ImportMetaEnvAugmented<
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    typeof import("./validate-env").default
  >;

interface ViteTypeOptions {
  // Avoid adding an index type to `ImportMetaDev` so
  // there's an error when accessing unknown properties.
  // ⚠️ This option requires Vite 6.3.x or higher
  strictImportMetaEnv: unknown;
}

declare namespace NodeJS {
  interface Process {
    /** Ensures we don't accidentally use process.env for other variables */
    env: {
      ANALYZE_BUILD: string | undefined;
      APPLE_NOTARIZATION_ENABLED: string | undefined;
      BUILDER_PUBLISH_S3_ENDPOINT: string | undefined;
      CI: string | undefined;
      ELECTRON_RENDERER_URL: string | undefined;
      FORCE_DEV_AUTO_UPDATE: string | undefined;
      NODE_ENV: string | undefined;
    };
  }
}
