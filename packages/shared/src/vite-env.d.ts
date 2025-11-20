declare namespace ImportMeta {
  interface Env {
    readonly VITE_APP_PROTOCOL: string;
  }
}

interface ImportMeta {
  readonly env: ImportMeta.Env;
}
