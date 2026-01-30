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
    output: process.env.ELECTRON_BUILDER_OUTPUT_DIR ?? "dist",
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
      filter: ["**/*.json"],
      from: "../../registry/api",
      to: "registry/api",
    },
    {
      from: "../../packages/shim-client/dist",
      to: "shim-client",
    },
  ],
  files: [
    "out/**/*",
    "resources/**/*",
    "node_modules/**",
    "!**/node_modules/**/*.md",
    "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
    "!**/node_modules/*.d.ts",
    "!**/node_modules/.bin",
    "!**/*.map", // someday we may want to keep these for debugging
    /* cspell:disable */
    "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
    "!.editorconfig",
    "!**/._*",
    "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
    "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
    "!**/{appveyor.yml,.travis.yml,circle.yml}",
    "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}",
    /* cspell:enable */
  ],
  generateUpdatesFilesForAllChannels: true,
  linux: {
    artifactName: "${productName}-${os}-${version}-${arch}.${ext}",
    category: "Utility",
    executableArgs: ["--ozone-platform=x11"],
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
  protocols: [
    {
      // Required for Linux deep linking
      name: "Quests",
      schemes: ["quests"],
    },
  ],
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
