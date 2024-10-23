import { logger } from "@/electron-main/lib/electron-logger";
import { getBinsFromPackageManifest } from "@pnpm/package-bins";
import { readPackageJsonFromDir } from "@pnpm/read-package-json";
import { type DependencyManifest } from "@pnpm/types";
import { promises as fs } from "node:fs";
import path from "node:path";
import normalizePath from "normalize-path";
import { isEmpty } from "radashi";

const scopedLogger = logger.scope("pnpm:bins");

/**
 * Gets the binary paths for all packages in node_modules that have binaries
 * @param projectPath Path to the project root (containing package.json)
 * @returns Map of package names to their binary paths
 */
export async function getAllPackageBinaryPaths(
  projectPath: string,
): Promise<Map<string, string[]>> {
  const manifest = await safeReadPkgJson(projectPath);
  if (!manifest) {
    return new Map();
  }

  const binPaths = new Map<string, string[]>();
  const allDeps = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
  };

  for (const [pkgName] of Object.entries(allDeps)) {
    const paths = await getPackageBinaryPaths(projectPath, pkgName);
    if (paths.length > 0) {
      binPaths.set(pkgName, paths);
    }
  }

  return binPaths;
}

/**
 * Gets the binary paths for a specific package in node_modules
 * @param projectPath Path to the project root (containing package.json)
 * @param packageName Name of the package to get binary paths for
 * @returns Array of paths to the package's binaries
 */
async function getPackageBinaryPaths(
  projectPath: string,
  packageName: string,
): Promise<string[]> {
  const pkgPath = path.join(projectPath, "node_modules", packageName);
  const bins = await getPackageBins(pkgPath);
  return bins.map((bin) => bin.path);
}

// Original source, which isn't exported: https://github.com/pnpm/pnpm/blob/cd8caece258e154274c2feb4d6dab3293cb8bc21/pkg-manager/link-bins/src/index.ts
// We need essentially the same functionality.
async function getPackageBins(target: string) {
  const manifest = await safeReadPkgJson(target);

  if (manifest == null) {
    // There's a directory in node_modules without package.json: ${target}.
    // This used to be a warning but it didn't really cause any issues.
    return [];
  }

  if (isEmpty(manifest.bin) && !(await isFromModules(target))) {
    scopedLogger.warn(
      `Package in ${target} must have a non-empty bin field to get bin linked.`,
      "EMPTY_BIN",
    );
    return [];
  }

  if (typeof manifest.bin === "string" && !manifest.name) {
    scopedLogger.warn(
      "INVALID_PACKAGE_NAME",
      `Package in ${target} must have a name to get bin linked.`,
    );
    return [];
  }

  return getBinsFromPackageManifest(manifest, target);
}

async function isFromModules(filename: string): Promise<boolean> {
  const real = await fs.realpath(filename);
  return normalizePath(real).includes("/node_modules/");
}

async function safeReadPkgJson(
  pkgDir: string,
): Promise<DependencyManifest | null> {
  try {
    return (await readPackageJsonFromDir(pkgDir)) as DependencyManifest;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
