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
const registryPath = path.join(repoRoot, "registry");
const registryToolVersionsPath = path.join(registryPath, ".tool-versions");
const registryNodeVersionPath = path.join(registryPath, ".node-version");
const registryPackageJsonPath = path.join(registryPath, "package.json");

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

function getExpectedTypesNodeMajorVersion(nodeVersion: string): string {
  const nodeVersionParts = parseVersion(nodeVersion);
  const majorVersion = nodeVersionParts[0];
  if (majorVersion === undefined) {
    throw new Error(`Invalid Node.js version format: ${nodeVersion}`);
  }
  return `${majorVersion}`;
}

function getNodeVersionFileVersion(filePath: string, name: string): string {
  const nodeVersion = readFileSync(filePath, "utf8");
  const version = nodeVersion.trim().replace(/^v/, "");
  if (!version) {
    throw new Error(`Could not find node version in ${name} .node-version`);
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

function getToolVersionsNodeVersion(filePath: string, name: string): string {
  const toolVersions = readFileSync(filePath, "utf8");
  const nodeVersionRegex = /^nodejs\s+(\S+)/m;
  const nodeVersionMatch = nodeVersionRegex.exec(toolVersions);
  if (!nodeVersionMatch?.[1]) {
    throw new Error(`Could not find nodejs version in ${name} .tool-versions`);
  }
  return nodeVersionMatch[1];
}

function majorVersionsMatch(version1: string, version2: string): boolean {
  const v1Parts = parseVersion(normalizeVersion(version1));
  const v2Parts = parseVersion(normalizeVersion(version2));
  return v1Parts[0] === v2Parts[0];
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
  const nodeVersionFileVersion = getNodeVersionFileVersion(
    nodeVersionPath,
    "root",
  );
  const toolVersionsNodeVersion = getToolVersionsNodeVersion(
    toolVersionsPath,
    "root",
  );
  const rootPackageJsonNodeVersion = getPackageJsonNodeVersion(
    rootPackageJsonPath,
    "root",
  );
  const studioPackageJsonNodeVersion = getPackageJsonNodeVersion(
    studioPackageJsonPath,
    "studio",
  );
  const registryToolVersionsNodeVersion = getToolVersionsNodeVersion(
    registryToolVersionsPath,
    "registry",
  );
  const registryNodeVersionFileVersion = getNodeVersionFileVersion(
    registryNodeVersionPath,
    "registry",
  );
  const registryPackageJsonNodeVersion = getPackageJsonNodeVersion(
    registryPackageJsonPath,
    "registry",
  );
  const pnpmWorkspaceTypesNodeVersion =
    getPnpmWorkspaceCatalogTypesNodeVersion();
  const expectedTypesNodeMajorVersion =
    getExpectedTypesNodeMajorVersion(electronNodeVersion);

  console.log(`Electron Node.js version: ${electronNodeVersion}`);
  console.log(`Root .node-version: ${nodeVersionFileVersion}`);
  console.log(`Root .tool-versions: ${toolVersionsNodeVersion}`);
  console.log(`Root package.json engines.node: ${rootPackageJsonNodeVersion}`);
  console.log(
    `Studio package.json engines.node: ${studioPackageJsonNodeVersion}`,
  );
  console.log(`Registry .tool-versions: ${registryToolVersionsNodeVersion}`);
  console.log(`Registry .node-version: ${registryNodeVersionFileVersion}`);
  console.log(
    `Registry package.json engines.node: ${registryPackageJsonNodeVersion}`,
  );
  console.log(
    `pnpm-workspace.yaml catalog @types/node: ${pnpmWorkspaceTypesNodeVersion}`,
  );
  console.log(
    `Expected @types/node major version: ${expectedTypesNodeMajorVersion}`,
  );

  const errors: string[] = [];

  if (!versionsMatch(nodeVersionFileVersion, electronNodeVersion)) {
    errors.push(
      `Root .node-version (${nodeVersionFileVersion}) does not match Electron Node.js version (${electronNodeVersion})`,
    );
  }

  if (!versionsMatch(toolVersionsNodeVersion, electronNodeVersion)) {
    errors.push(
      `Root .tool-versions (${toolVersionsNodeVersion}) does not match Electron Node.js version (${electronNodeVersion})`,
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

  if (!versionsMatch(registryToolVersionsNodeVersion, electronNodeVersion)) {
    errors.push(
      `Registry .tool-versions (${registryToolVersionsNodeVersion}) does not match Electron Node.js version (${electronNodeVersion})`,
    );
  }

  if (!versionsMatch(registryNodeVersionFileVersion, electronNodeVersion)) {
    errors.push(
      `Registry .node-version (${registryNodeVersionFileVersion}) does not match Electron Node.js version (${electronNodeVersion})`,
    );
  }

  if (!versionsMatch(registryPackageJsonNodeVersion, electronNodeVersion)) {
    errors.push(
      `Registry package.json engines.node (${registryPackageJsonNodeVersion}) does not match Electron Node.js version (${electronNodeVersion})`,
    );
  }

  if (
    !majorVersionsMatch(
      pnpmWorkspaceTypesNodeVersion,
      expectedTypesNodeMajorVersion,
    )
  ) {
    errors.push(
      `pnpm-workspace.yaml catalog @types/node (${pnpmWorkspaceTypesNodeVersion}) major version does not match expected major version (${expectedTypesNodeMajorVersion})`,
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
