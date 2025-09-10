import dotenv from "dotenv";
import { type Configuration } from "electron-builder";
import fs from "node:fs";
import path from "node:path";

if (process.env.CI !== "true") {
  dotenv.config({
    path: [".env.build"],
  });
}

/**
 * @see https://www.electron.build/#documentation
 */
const config: Configuration = {
  afterPack(context) {
    // eslint-disable-next-line no-console
    console.log("Creating symlinks in afterPack...");
    const appOutDir = context.appOutDir;
    const appName = context.packager.appInfo.productFilename;
    const appPath = path.join(appOutDir, `${appName}.app`);
    const resourcesPath = path.join(appPath, "Contents", "Resources");
    const asarUnpackedPath = path.join(resourcesPath, "app.asar.unpacked");
    const binDir = path.join(asarUnpackedPath, "bin");

    const createBinaryPath = (packagePath: string, binFile: string) =>
      path.join(asarUnpackedPath, "node_modules", packagePath, "bin", binFile);

    const binaries = [
      {
        symlink: "pnpm",
        target: createBinaryPath("pnpm", "pnpm.cjs"),
      },
      {
        symlink: "git",
        target: createBinaryPath("dugite/git", "git"),
      },
      {
        symlink: "rg",
        target: createBinaryPath("@vscode/ripgrep", "rg"),
      },
      {
        symlink: "pnpx",
        target: createBinaryPath("pnpm", "pnpx.cjs"),
      },
      {
        symlink: "node",
        target: path.join(appPath, "Contents", "MacOS", appName),
      },
    ];

    try {
      if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
        // eslint-disable-next-line no-console
        console.log(`Created bin directory: ${binDir}`);
      }

      for (const binary of binaries) {
        const targetFile = binary.target;
        const symlinkPath = path.join(binDir, binary.symlink);

        if (fs.existsSync(targetFile)) {
          const relativePath = path.relative(binDir, targetFile);
          fs.symlinkSync(relativePath, symlinkPath);
          // eslint-disable-next-line no-console
          console.log(`Symlink created: ${symlinkPath} -> ${relativePath}`);
        } else {
          // eslint-disable-next-line no-console
          console.warn(`Target file not found: ${targetFile}`);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to create symlinks");
      throw error;
    }
  },
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
    "!scripts/*",
    "!dev-bin/*",
    "!src/*",
    "!**/.turbo/*",
    "!{.env,.env.*,.npmrc,pnpm-lock.yaml}",
    "!{.eslintignore,eslint.config.ts,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md,.eslintcache,drizzle.config.ts,vitest.config.ts,tsconfig.tsbuildinfo,postcss.config.cjs,components.json}",
    "!{tsconfig.json}",
  ],
  linux: {
    artifactName: "${productName}-${os}-${version}-${arch}.${ext}",
    category: "Utility",
    executableName: "quests",
    maintainer: "quests.dev",
    target: ["AppImage", "deb", "snap"],
  },
  mac: {
    category: "public.app-category.developer-tools",
    entitlementsInherit: "build/entitlements.mac.plist",
    gatekeeperAssess: false,
    hardenedRuntime: true,
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    notarize: process.env.APPLE_NOTARIZATION_ENABLED === "true",
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
  },
};

export default config;
