import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { _electron as electron } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("Studio Smoke Test", () => {
  let distPath: string;
  let tempUserDataDir: string;

  beforeAll(async () => {
    // Must run the app outside of the monorepo to avoid inheriting node modules
    distPath = await fs.mkdtemp(path.join(tmpdir(), "quests-smoke-app-"));
    tempUserDataDir = await fs.mkdtemp(
      path.join(tmpdir(), "quests-smoke-test-"),
    );

    execSync("pnpm run build:env:unsigned", {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ELECTRON_BUILDER_OUTPUT_DIR: distPath,
      },
      stdio: "inherit",
    });
  }, 300_000);

  afterAll(async () => {
    await fs.rm(distPath, { force: true, recursive: true });
    await fs.rm(tempUserDataDir, { force: true, recursive: true });
  });

  it("should launch the app and verify basic functionality", async () => {
    const platform = process.platform;
    let executablePath: string;

    if (platform === "darwin") {
      executablePath = path.join(
        distPath,
        "mac-arm64/Quests.app/Contents/MacOS/Quests",
      );
      try {
        await fs.access(executablePath);
      } catch {
        executablePath = path.join(
          distPath,
          "mac-x64/Quests.app/Contents/MacOS/Quests",
        );
      }
      try {
        await fs.access(executablePath);
      } catch {
        executablePath = path.join(
          distPath,
          "mac/Quests.app/Contents/MacOS/Quests",
        );
      }
    } else if (platform === "win32") {
      executablePath = path.join(distPath, "win-unpacked/Quests.exe");
    } else {
      executablePath = path.join(distPath, "linux-unpacked/quests");
    }

    try {
      await fs.access(executablePath);
    } catch {
      let distContents = "unable to read dist directory";
      try {
        const files = await fs.readdir(distPath);
        distContents = files.join(", ");
      } catch {
        // Keep default message
      }
      throw new Error(
        `Executable not found at: ${executablePath}\nAvailable dist contents: ${distContents}`,
      );
    }

    const electronApp = await electron.launch({
      args: platform === "linux" ? ["--no-sandbox", "--disable-gpu"] : [],
      env: {
        ...(process.env as Record<string, string>),
        ELECTRON_USER_DATA_DIR: tempUserDataDir,
        SKIP_MOVE_TO_APPLICATIONS: "true",
      },
      executablePath,
      timeout: 60_000,
    });

    expect(electronApp).toBeDefined();

    await electronApp.firstWindow({ timeout: 30_000 });

    let windows = electronApp.windows();
    const startTime = Date.now();
    while (windows.length < 3 && Date.now() - startTime < 30_000) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      windows = electronApp.windows();
    }

    expect(windows).toHaveLength(3);

    const sidebarWindow = windows.find((w) => w.url().includes("#/sidebar"));
    const toolbarWindow = windows.find((w) => w.url().includes("#/toolbar"));
    const mainWindow = windows.find(
      (w) => !w.url().includes("#/sidebar") && !w.url().includes("#/toolbar"),
    );

    const windowConfigs = [
      { name: "sidebar", testId: "sidebar-page", window: sidebarWindow },
      { name: "toolbar", testId: "toolbar-page", window: toolbarWindow },
      { name: "main", testId: "app-page", window: mainWindow },
    ];

    for (const { name, window } of windowConfigs) {
      expect(window, `${name} window`).toBeDefined();
      if (!window) {
        throw new Error(`${name} window not found`);
      }
    }

    const definedWindows = windowConfigs.map(({ window }) => window);
    if (definedWindows.some((w) => !w)) {
      throw new Error("Some windows are undefined");
    }

    await Promise.all(
      definedWindows.map((window) =>
        window?.waitForLoadState("domcontentloaded", { timeout: 30_000 }),
      ),
    );

    await Promise.all(
      windowConfigs.map(({ testId, window }) =>
        window?.waitForSelector(`[data-testid="${testId}"]`, {
          timeout: 30_000,
        }),
      ),
    );

    await Promise.all(
      definedWindows.map(async (window) => {
        expect(await window?.isVisible("#root > *")).toBe(true);
      }),
    );

    await electronApp.close();

    const requiredPaths = [
      path.join(tempUserDataDir, "bin"),
      path.join(tempUserDataDir, "preferences.json"),
      path.join(tempUserDataDir, "app-state.json"),
    ];

    for (const filePath of requiredPaths) {
      let exists = true;
      try {
        await fs.access(filePath);
      } catch {
        exists = false;
      }
      expect(exists).toBe(true);
    }
  });
});
