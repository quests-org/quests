import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Electron App Smoke Test", () => {
  let tempUserDataDir: string;

  beforeAll(() => {
    tempUserDataDir = mkdtempSync(path.join(tmpdir(), "quests-smoke-test-"));
  });

  afterAll(() => {
    rmSync(tempUserDataDir, { force: true, recursive: true });
  });

  it("should launch the app and verify basic functionality", async () => {
    const platform = process.platform;
    let executablePath: string;

    if (platform === "darwin") {
      executablePath = path.join(
        process.cwd(),
        "dist/mac-arm64/Quests.app/Contents/MacOS/Quests",
      );
      if (!existsSync(executablePath)) {
        executablePath = path.join(
          process.cwd(),
          "dist/mac-x64/Quests.app/Contents/MacOS/Quests",
        );
      }
      if (!existsSync(executablePath)) {
        executablePath = path.join(
          process.cwd(),
          "dist/mac/Quests.app/Contents/MacOS/Quests",
        );
      }
    } else if (platform === "win32") {
      executablePath = path.join(process.cwd(), "dist/win-unpacked/Quests.exe");
    } else {
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

    const electronApp = await electron.launch({
      env: {
        ELECTRON_USER_DATA_DIR: tempUserDataDir,
        SKIP_MOVE_TO_APPLICATIONS: "true",
      },
      executablePath,
      timeout: 60_000,
    });

    expect(electronApp).toBeDefined();

    const window = await electronApp.firstWindow({ timeout: 30_000 });
    expect(window).toBeDefined();

    await window.waitForLoadState("domcontentloaded", { timeout: 30_000 });

    await window.waitForSelector("#root > *", { timeout: 30_000 });

    const title = await window.title();
    expect(title).toBe("Quests");

    const isVisible = await window.isVisible("body");
    expect(isVisible).toBe(true);

    await electronApp.close();

    const binDir = path.join(tempUserDataDir, "bin");
    expect(existsSync(binDir)).toBe(true);

    const preferencesFile = path.join(tempUserDataDir, "preferences.json");
    expect(existsSync(preferencesFile)).toBe(true);

    const appStateFile = path.join(tempUserDataDir, "app-state.json");
    expect(existsSync(appStateFile)).toBe(true);
  });
});
