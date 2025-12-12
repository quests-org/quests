/* eslint-disable no-console */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const toolVersionsPath = path.join(repoRoot, ".tool-versions");
const nodeVersionPath = path.join(repoRoot, ".node-version");
const rootPackageJsonPath = path.join(repoRoot, "package.json");
const pnpmWorkspacePath = path.join(repoRoot, "pnpm-workspace.yaml");
const studioPath = path.join(repoRoot, "apps/studio");
const studioPackageJsonPath = path.join(studioPath, "package.json");

function compareVersions(version1: string, version2: string): number {
  const v1 = parseVersion(version1);
  const v2 = parseVersion(version2);
  for (let i = 0; i < 3; i++) {
    const part1 = v1[i];
    const part2 = v2[i];
    if (part1 === undefined || part2 === undefined) {
      continue;
    }
    if (part1 > part2) {
      return 1;
    }
    if (part1 < part2) {
      return -1;
    }
  }
  return 0;
}

function findClosestTypesNodeVersion(nodeVersion: string): string {
  try {
    const output = execSync("npm view @types/node versions --json", {
      encoding: "utf8",
      stdio: "pipe",
    });

    const versions = JSON.parse(output) as string[];
    if (!Array.isArray(versions)) {
      throw new TypeError("Invalid response from npm");
    }

    const nodeVersionParts = parseVersion(nodeVersion);
    const matchingVersions = versions.filter((version) => {
      const versionParts = parseVersion(version);
      for (let i = 0; i < 3; i++) {
        const versionPart = versionParts[i];
        const nodePart = nodeVersionParts[i];
        if (versionPart === undefined || nodePart === undefined) {
          continue;
        }
        if (versionPart > nodePart) {
          return false;
        }
        if (versionPart < nodePart) {
          return true;
        }
      }
      return true;
    });

    if (matchingVersions.length === 0) {
      throw new Error(
        `No @types/node version found that is <= Node.js version ${nodeVersion}`,
      );
    }

    matchingVersions.sort((a, b) => compareVersions(b, a));
    const closestVersion = matchingVersions[0];
    if (!closestVersion) {
      throw new Error("No matching @types/node version found");
    }
    return closestVersion;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Failed to query npm for @types/node versions: ${message}`);
  }
}

function getElectronNodeVersion(): string {
  try {
    const output = execSync("pnpm exec electron -v", {
      cwd: studioPath,
      encoding: "utf8",
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    });

    const nodeVersion = output.trim().replace(/^v/, "");
    if (!nodeVersion) {
      throw new Error(
        `Could not parse Node version from Electron output: ${output}`,
      );
    }

    return nodeVersion;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(
      `Failed to get Electron Node version: ${message}. Make sure electron is installed in apps/studio.`,
    );
  }
}

function getNodeVersionFileVersion(): string {
  const nodeVersion = readFileSync(nodeVersionPath, "utf8");
  const version = nodeVersion.trim().replace(/^v/, "");
  if (!version) {
    throw new Error("Could not find node version in .node-version");
  }
  return version;
}

function getPackageJsonNodeVersion(
  packageJsonPath: string,
  packageName: string,
): string {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    engines?: { node?: string };
  };
  const nodeVersion = packageJson.engines?.node;
  if (!nodeVersion) {
    throw new Error(
      `Could not find engines.node in ${packageName} package.json`,
    );
  }

  const versionMatch = /^>=?(\S+)/.exec(nodeVersion);
  if (!versionMatch?.[1]) {
    throw new Error(
      `Could not parse node version from ${packageName} package.json engines.node: ${nodeVersion}`,
    );
  }
  return versionMatch[1];
}

function getPnpmWorkspaceCatalogTypesNodeVersion(): string {
  const pnpmWorkspace = readFileSync(pnpmWorkspacePath, "utf8");
  const typesNodeRegex = /"@types\/node":\s*(\S+)/;
  const typesNodeMatch = typesNodeRegex.exec(pnpmWorkspace);
  if (!typesNodeMatch?.[1]) {
    throw new Error(
      "Could not find @types/node version in pnpm-workspace.yaml catalog",
    );
  }
  return typesNodeMatch[1];
}

function getToolVersionsNodeVersion(): string {
  const toolVersions = readFileSync(toolVersionsPath, "utf8");
  const nodeVersionRegex = /^nodejs\s+(\S+)/m;
  const nodeVersionMatch = nodeVersionRegex.exec(toolVersions);
  if (!nodeVersionMatch?.[1]) {
    throw new Error("Could not find nodejs version in .tool-versions");
  }
  return nodeVersionMatch[1];
}

function normalizeVersion(version: string): string {
  const normalized = version.split("-")[0];
  if (!normalized) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return normalized;
}

function parseVersion(version: string): number[] {
  const parts = version.split(".").map(Number);
  while (parts.length < 3) {
    parts.push(0);
  }
  return parts;
}

function versionsMatch(version1: string, version2: string): boolean {
  const normalized1 = normalizeVersion(version1);
  const normalized2 = normalizeVersion(version2);
  return normalized1 === normalized2;
}

try {
  const electronNodeVersion = getElectronNodeVersion();
  const nodeVersionFileVersion = getNodeVersionFileVersion();
  const toolVersionsNodeVersion = getToolVersionsNodeVersion();
  const rootPackageJsonNodeVersion = getPackageJsonNodeVersion(
    rootPackageJsonPath,
    "root",
  );
  const studioPackageJsonNodeVersion = getPackageJsonNodeVersion(
    studioPackageJsonPath,
    "studio",
  );
  const pnpmWorkspaceTypesNodeVersion =
    getPnpmWorkspaceCatalogTypesNodeVersion();
  const expectedTypesNodeVersion =
    findClosestTypesNodeVersion(electronNodeVersion);

  console.log(`Electron Node.js version: ${electronNodeVersion}`);
  console.log(`.node-version: ${nodeVersionFileVersion}`);
  console.log(`.tool-versions: ${toolVersionsNodeVersion}`);
  console.log(`Root package.json engines.node: ${rootPackageJsonNodeVersion}`);
  console.log(
    `Studio package.json engines.node: ${studioPackageJsonNodeVersion}`,
  );
  console.log(
    `pnpm-workspace.yaml catalog @types/node: ${pnpmWorkspaceTypesNodeVersion}`,
  );
  console.log(
    `Expected @types/node version (closest <= ${electronNodeVersion}): ${expectedTypesNodeVersion}`,
  );

  const errors: string[] = [];

  if (!versionsMatch(nodeVersionFileVersion, electronNodeVersion)) {
    errors.push(
      `.node-version (${nodeVersionFileVersion}) does not match Electron Node.js version (${electronNodeVersion})`,
    );
  }

  if (!versionsMatch(toolVersionsNodeVersion, electronNodeVersion)) {
    errors.push(
      `.tool-versions (${toolVersionsNodeVersion}) does not match Electron Node.js version (${electronNodeVersion})`,
    );
  }

  if (!versionsMatch(rootPackageJsonNodeVersion, electronNodeVersion)) {
    errors.push(
      `Root package.json engines.node (${rootPackageJsonNodeVersion}) does not match Electron Node.js version (${electronNodeVersion})`,
    );
  }

  if (!versionsMatch(studioPackageJsonNodeVersion, electronNodeVersion)) {
    errors.push(
      `Studio package.json engines.node (${studioPackageJsonNodeVersion}) does not match Electron Node.js version (${electronNodeVersion})`,
    );
  }

  if (!versionsMatch(pnpmWorkspaceTypesNodeVersion, expectedTypesNodeVersion)) {
    errors.push(
      `pnpm-workspace.yaml catalog @types/node (${pnpmWorkspaceTypesNodeVersion}) does not match expected version (${expectedTypesNodeVersion}, closest <= ${electronNodeVersion})`,
    );
  }

  if (errors.length > 0) {
    console.error(`\n❌ Node.js version mismatches found:\n`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    console.error(
      `\nPlease update the mismatched files to match Electron's Node.js version (${electronNodeVersion}).`,
    );
    // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
    process.exit(1);
  }

  console.log("✅ All Node.js versions match!");
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Unknown error occurred";
  console.error("Error checking Electron Node.js version:", message);
  // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
  process.exit(1);
}
/* eslint-enable no-console */
