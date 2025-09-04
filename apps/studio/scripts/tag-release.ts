import { execSync } from "node:child_process";
import path from "node:path";
import { readPackage } from "read-pkg";
import semver from "semver";
import { updatePackage } from "write-package";

const REGISTRY_DIR_PATH = path.join(process.cwd(), "..", "..", "registry");

/* eslint-disable no-console */
function checkRegistrySubmodule() {
  try {
    console.log("Checking if registry submodule is up to date...");

    execSync(`cd ${REGISTRY_DIR_PATH} && git fetch origin`, { stdio: "pipe" });

    const result = execSync(
      `cd ${REGISTRY_DIR_PATH} && git log HEAD..origin/main --oneline`,
      {
        encoding: "utf8",
        stdio: "pipe",
      },
    );

    if (result.trim()) {
      console.error("❌ Registry submodule is not up to date!");
      console.error("There are new commits available on the remote:");
      console.error(result);
      console.error(
        "Please update the registry submodule before tagging a release:",
      );
      console.error("  pnpm run scripts:update-registry");
      throw new Error("Registry submodule is not up to date");
    }

    console.log("✅ Registry submodule is up to date");
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Registry submodule is not up to date"
    ) {
      throw error;
    }
    console.error("Error checking registry submodule:", error);
    throw new Error("Failed to check registry submodule");
  }
}

async function main() {
  try {
    const versionType = process.argv[2] as "minor" | "patch" | undefined;
    const releaseType = versionType || "patch";

    if (versionType && !["minor", "patch"].includes(versionType)) {
      throw new Error(
        `Invalid version type: ${versionType}. Must be "patch" or "minor"`,
      );
    }

    checkRegistrySubmodule();

    const packageJsonPath = path.join(process.cwd(), "package.json");

    const packageJson = await readPackage();

    const currentVersion = packageJson.version;
    const newVersion = semver.inc(currentVersion, releaseType);

    if (!newVersion) {
      throw new Error(`Failed to increment version from ${currentVersion}`);
    }

    console.log(
      `Updating ${releaseType} version from ${currentVersion} to ${newVersion}`,
    );

    await updatePackage(packageJsonPath, { version: newVersion });

    execSync("git add package.json", { stdio: "inherit" });

    const tagName = `v${newVersion}`;
    const commitMessage = `release(studio): ${tagName}`;
    execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit" });

    execSync(`git tag "${tagName}"`, { stdio: "inherit" });

    console.log(`Successfully released version ${newVersion}`);
    console.log(`Commit: ${commitMessage}`);
    console.log(`Tag: ${tagName}`);
  } catch (error) {
    console.error("Error during release:", error);
    // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
    process.exit(1);
  }
}
/* eslint-enable no-console */

await main();
