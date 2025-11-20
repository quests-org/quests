declare namespace ImportMeta {
  interface Env {
    readonly VITE_APP_PROTOCOL: string;
    readonly VITE_QUESTS_API_BASE_URL: string;
  }
}

interface ImportMeta {
  readonly env: ImportMeta.Env;
}
