/* eslint-disable no-console */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";

async function runSmokeTest() {
  console.log("🚀 Starting Electron smoke test...");

  const tempUserDataDir = mkdtempSync(
    path.join(tmpdir(), "quests-smoke-test-"),
  );
  console.log(`📁 Created temp user data dir: ${tempUserDataDir}`);

  try {
    // Determine the executable path based on platform
    const platform = process.platform;
    let executablePath: string;

    if (platform === "darwin") {
      // macOS
      executablePath = path.join(
        process.cwd(),
        "dist/mac-arm64/Quests.app/Contents/MacOS/Quests",
      );
      // Fallback to x64 if arm64 doesn't exist
      if (!existsSync(executablePath)) {
        executablePath = path.join(
          process.cwd(),
          "dist/mac-x64/Quests.app/Contents/MacOS/Quests",
        );
      }
      // Fallback to universal build
      if (!existsSync(executablePath)) {
        executablePath = path.join(
          process.cwd(),
          "dist/mac/Quests.app/Contents/MacOS/Quests",
        );
      }
    } else if (platform === "win32") {
      // Windows
      executablePath = path.join(process.cwd(), "dist/win-unpacked/Quests.exe");
    } else {
      // Linux
      executablePath = path.join(process.cwd(), "dist/linux-unpacked/quests");
    }

    if (!existsSync(executablePath)) {
      const distPath = path.join(process.cwd(), "dist");
      let distContents = "dist directory not found";
      if (existsSync(distPath)) {
        const { readdirSync } = await import("node:fs");
        distContents = readdirSync(distPath).join(", ");
      }
      throw new Error(
        `Executable not found at: ${executablePath}\nAvailable dist contents: ${distContents}`,
      );
    }

    console.log(`📦 Using executable: ${executablePath}`);

    // Launch the Electron app with environment variable to skip macOS dialog
    const electronApp = await electron.launch({
      env: {
        ELECTRON_USER_DATA_DIR: tempUserDataDir,
        SKIP_MOVE_TO_APPLICATIONS: "true",
      },
      executablePath,
      timeout: 60_000, // 60 seconds timeout for launch
    });

    console.log("✅ App launched successfully");

    // Get the first window
    const window = await electronApp.firstWindow({ timeout: 30_000 });
    console.log("✅ Window opened");

    // Wait for the page to load
    await window.waitForLoadState("domcontentloaded", { timeout: 30_000 });
    console.log("✅ DOM content loaded");

    // Wait for React to render by checking for the root element to have content
    await window.waitForSelector("#root > *", { timeout: 30_000 });
    console.log("✅ React root has rendered content");

    // Get the window title
    const title = await window.title();
    console.log(`✅ Window title: "${title}"`);

    // Check if window is visible
    const isVisible = await window.isVisible("body");
    if (!isVisible) {
      throw new Error("Window body is not visible");
    }
    console.log("✅ Window is visible");

    // Close the app
    await electronApp.close();
    console.log("✅ App closed successfully");

    // Verify expected files and directories were created
    const binDir = path.join(tempUserDataDir, "bin");
    if (!existsSync(binDir)) {
      throw new Error(`Expected bin directory not found at: ${binDir}`);
    }
    console.log("✅ bin directory created");

    const preferencesFile = path.join(tempUserDataDir, "preferences.json");
    if (!existsSync(preferencesFile)) {
      throw new Error(
        `Expected preferences.json not found at: ${preferencesFile}`,
      );
    }
    console.log("✅ preferences.json created");

    const appStateFile = path.join(tempUserDataDir, "app-state.json");
    if (!existsSync(appStateFile)) {
      throw new Error(`Expected app-state.json not found at: ${appStateFile}`);
    }
    console.log("✅ app-state.json created");

    console.log("\n🎉 Smoke test passed!");
  } finally {
    // Clean up temp directory
    rmSync(tempUserDataDir, { force: true, recursive: true });
    console.log("🧹 Cleaned up temp user data dir");
  }
}

try {
  await runSmokeTest();
  console.log("✨ All tests completed successfully");
} catch (error) {
  console.error("\n❌ Smoke test failed:");
  console.error(error);
  // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
  process.exit(1);
}

/* eslint-enable no-console */
