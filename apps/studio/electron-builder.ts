import dotenv from "dotenv";
import {
  type Configuration,
  type PlatformSpecificBuildOptions,
} from "electron-builder";

if (process.env.CI !== "true") {
  dotenv.config({
    path: [".env.build"],
  });
}

const publishConfig: PlatformSpecificBuildOptions["publish"] = {
  bucket: "quests-releases",
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  endpoint: process.env.BUILDER_PUBLISH_S3_ENDPOINT,
  provider: "s3",
  region: "auto",
  updaterCacheDirName: "quests-desktop-updater",
};

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
      from: "../../packages/shim-client/dist",
      to: "shim-client",
    },
  ],
  files: [
    "out/**/*",
    "resources/**/*",
    "!node_modules/**",
    "node_modules/pnpm/**",
    "node_modules/dugite/**",
    "node_modules/@vscode/**",
  ],
  generateUpdatesFilesForAllChannels: true,
  linux: {
    artifactName: "${productName}-${os}-${version}-${arch}.${ext}",
    category: "Utility",
    executableName: "quests",
    icon: "build/icons",
    maintainer: "quests.dev",
    target: ["AppImage", "deb", "rpm", "tar.gz"],
  },
  mac: {
    category: "public.app-category.developer-tools",
    entitlementsInherit: "build/entitlements.mac.plist",
    gatekeeperAssess: false,
    hardenedRuntime: true,
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    notarize: process.env.APPLE_NOTARIZATION_ENABLED === "true",
    publish: {
      ...publishConfig,
      channel:
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        process.env.ARCH === "x64" ? "${channel}-${arch}" : undefined,
    },
    target: ["dmg", "zip"],
  },
  npmRebuild: true,
  nsis: {
    artifactName: "${productName}-${os}-${version}-${arch}.${ext}",
    createDesktopShortcut: "always",
    shortcutName: "${productName}",
    uninstallDisplayName: "${productName}",
  },
  productName: "Quests",
  publish: publishConfig,
  win: {
    executableName: "quests",
    signtoolOptions: {
      publisherName: "Finalpoint, LLC",
      sign: "scripts/win-cloud-hsm-sign.js",
    },
    target: ["nsis"],
  },
};

export default config;
