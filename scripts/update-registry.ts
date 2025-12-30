import { execSync } from "node:child_process";

function main() {
  try {
    console.log("Updating registry submodule...");

    execSync("git submodule update --remote registry", { stdio: "inherit" });

    const statusResult = execSync("git status --porcelain registry", {
      encoding: "utf8",
    });

    if (!statusResult.trim()) {
      console.log("Registry is already up to date");
      return;
    }

    execSync("git add registry", { stdio: "inherit" });

    const commitMessage = "feat(registry): update to latest";
    execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit" });

    console.log("Successfully updated registry");
    console.log(`Commit: ${commitMessage}`);
  } catch (error) {
    console.error("Error during registry update:", error);
    // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
    process.exit(1);
  }
}

main();
