import dotenv from "dotenv";
import { type Configuration } from "electron-builder";

if (process.env.CI !== "true") {
  dotenv.config({
    path: [".env.build"],
  });
}

/**
 * @see https://www.electron.build/#documentation
 */
const config: Configuration = {
  appId: "com.finalpoint.quests",
  appImage: {
    artifactName: "${productName}-${os}-${version}-${arch}.${ext}",
  },
  asarUnpack: ["resources/**"],
  directories: {
    buildResources: "build",
  },
  dmg: {
    artifactName: "${productName}-${os}-${version}-${arch}.${ext}",
  },
  extraResources: [
    {
      filter: [
        "**/*",
        "!**/node_modules/**",
        "!**/.turbo/**",
        "!**/.eslintcache",
      ],
      from: "../../registry/templates",
      to: "registry/templates",
    },
    {
      filter: [
        "**/*",
        "!**/node_modules/**",
        "!**/.turbo/**",
        "!**/.eslintcache",
      ],
      from: "../../registry/apps",
      to: "registry/apps",
    },
    {
      from: "../../packages/shim-server/dist",
      to: "shim-server",
    },
    {
      from: "../../packages/shim-client/dist",
      to: "shim-client",
    },
  ],
  files: [
    "!**/.vscode/*",
    "!electron.vite.config.{js,ts,mjs,cjs}",
    "!fixtures/*",
    "!llm-cache.local/*",
    "!scripts/*",
    "!src/*",
    "!**/.turbo/*",
    "!{.env,.env.*,.npmrc,pnpm-lock.yaml}",
    "!{.eslintignore,eslint.config.ts,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md,.eslintcache,drizzle.config.ts,vitest.config.ts,tsconfig.tsbuildinfo,postcss.config.cjs,components.json}",
    "!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}",
  ],
  linux: {
    artifactName: "${productName}-${os}-${version}-${arch}.${ext}",
    category: "Utility",
    executableName: "quests",
    icon: "build/icons",
    maintainer: "quests.dev",
    target: [
      { arch: ["x64", "arm64"], target: "AppImage" },
      { arch: ["x64", "arm64"], target: "deb" },
      { arch: ["x64", "arm64"], target: "rpm" },
      { arch: ["x64", "arm64"], target: "tar.gz" },
    ],
  },
  mac: {
    category: "public.app-category.developer-tools",
    entitlementsInherit: "build/entitlements.mac.plist",
    gatekeeperAssess: false,
    hardenedRuntime: true,
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    notarize: process.env.APPLE_NOTARIZATION_ENABLED === "true",
    target: [
      { arch: ["x64", "arm64"], target: "dmg" },
      { arch: ["x64", "arm64"], target: "zip" },
    ],
  },
  npmRebuild: false,
  nsis: {
    artifactName: "${productName}-${os}-${version}-${arch}.${ext}",
    createDesktopShortcut: "always",
    shortcutName: "${productName}",
    uninstallDisplayName: "${productName}",
  },
  productName: "Quests",
  publish: {
    bucket: "quests-releases",
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    endpoint: process.env.BUILDER_PUBLISH_S3_ENDPOINT,
    provider: "s3",
    region: "auto",
    updaterCacheDirName: "quests-desktop-updater",
  },
  win: {
    executableName: "quests",
    target: [{ arch: ["x64", "arm64"], target: "nsis" }],
  },
};

export default config;
