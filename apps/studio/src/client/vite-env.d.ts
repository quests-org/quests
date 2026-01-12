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
      ARCH: string | undefined;
      BUILDER_PUBLISH_S3_ENDPOINT: string | undefined;
      CI: string | undefined;
      ELECTRON_DEV_USER_FOLDER_SUFFIX: string | undefined;
      ELECTRON_RENDERER_URL: string | undefined;
      ELECTRON_USE_NEW_USER_FOLDER: string | undefined;
      ELECTRON_USER_DATA_DIR: string | undefined;
      FORCE_DEV_AUTO_UPDATE: string | undefined;
      NODE_ENV: string | undefined;
      PATH: string | undefined;
      SIGNTOOL_PATH: string | undefined;
      SKIP_MOVE_TO_APPLICATIONS: string | undefined;
      WIN_CERT_PATH: string | undefined;
      WIN_GCP_KMS_KEY_VERSION: string | undefined;
      WIN_TIMESTAMP_URL: string | undefined;
    };
  }
}
