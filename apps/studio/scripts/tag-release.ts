import { execSync } from "node:child_process";
import path from "node:path";
import { readPackage } from "read-pkg";
import semver from "semver";
import { updatePackage } from "write-package";

/* eslint-disable no-console */
async function main() {
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");

    // Read current package.json using read-pkg
    const packageJson = await readPackage();

    // Get current version and increment patch version using semver
    const currentVersion = packageJson.version;
    const newVersion = semver.inc(currentVersion, "patch");

    if (!newVersion) {
      throw new Error(`Failed to increment version from ${currentVersion}`);
    }

    console.log(`Updating version from ${currentVersion} to ${newVersion}`);

    // Update package.json with new version
    await updatePackage(packageJsonPath, { version: newVersion });

    // Stage the package.json file
    execSync("git add package.json", { stdio: "inherit" });

    // Commit with the specified format
    const tagName = `v${newVersion}`;
    const commitMessage = `release(studio): ${tagName}`;
    execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit" });

    // Tag the commit
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

// Run the script
await main();
