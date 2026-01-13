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
      expect(existsSync(filePath)).toBe(true);
    }
  });
});
