import { execSync } from "node:child_process";
import path from "node:path";
import { readPackage } from "read-pkg";
import semver from "semver";
import { updatePackage } from "write-package";

/* eslint-disable no-console */
async function main() {
  try {
    const versionType = process.argv[2] as "minor" | "patch" | undefined;
    const releaseType = versionType || "patch";

    if (versionType && !["minor", "patch"].includes(versionType)) {
      throw new Error(
        `Invalid version type: ${versionType}. Must be "patch" or "minor"`,
      );
    }

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
