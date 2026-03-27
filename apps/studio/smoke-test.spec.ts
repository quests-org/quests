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

  it("should not contain monorepo paths baked into compiled bundles", async () => {
    // Guards against build-time path resolution leaking into the bundle as a
    // hardcoded string (e.g. require.resolve() in dev mode). First caught with
    // ffmpeg-static: the app passed the smoke test but launched with no window
    // on any other machine. Only main/preload run in Node and can do fs requires;
    // the renderer is irrelevant here.
    const repoRoot = path.resolve(process.cwd(), "../..");
    // Check both slash styles -- vite may normalize to "/" even on Windows.
    const repoRootForward = repoRoot.replaceAll("\\", "/");

    const bundleFiles = [
      path.join(process.cwd(), "out/main/index.js"),
      path.join(process.cwd(), "out/preload/index.mjs"),
    ];

    for (const bundleFile of bundleFiles) {
      const label = `${path.basename(path.dirname(bundleFile))}/${path.basename(bundleFile)}`;
      const content = await fs.readFile(bundleFile, "utf8");

      for (const needle of [repoRoot, repoRootForward]) {
        const idx = content.indexOf(needle);
        if (idx === -1) continue;

        // Snippet avoids vitest diffing the entire bundle (thousands of lines).
        const snippetStart = Math.max(0, idx - 60);
        const snippetEnd = Math.min(content.length, idx + needle.length + 60);
        const snippet = content.slice(snippetStart, snippetEnd).trim();
        expect.fail(
          `${label} contains a baked-in monorepo path.\n` +
            `  needle: ${needle}\n` +
            `  context: ...${snippet}...`,
        );
      }
    }
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
        ELECTRON_ENABLE_CONSOLE_LOGGING: "true",
        ELECTRON_USER_DATA_DIR: tempUserDataDir,
        SKIP_MOVE_TO_APPLICATIONS: "true",
      },
      executablePath,
      timeout: 60_000,
    });

    const childProcess = electronApp.process();

    childProcess.stdout?.on("data", (data: Buffer | string) => {
      // eslint-disable-next-line no-console
      console.log(Buffer.isBuffer(data) ? data.toString("utf8") : data);
    });

    childProcess.stderr?.on("data", (data: Buffer | string) => {
      // eslint-disable-next-line no-console
      console.error(Buffer.isBuffer(data) ? data.toString("utf8") : data);
    });

    electronApp.on("console", (msg) => {
      // eslint-disable-next-line no-console
      console.log(msg.text());
    });

    expect(electronApp).toBeDefined();

    await electronApp.firstWindow({ timeout: 30_000 });

    let windows = electronApp.windows();
    const startTime = Date.now();
    while (windows.length < 2 && Date.now() - startTime < 30_000) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      windows = electronApp.windows();
    }

    expect(windows).toHaveLength(2);

    const sidebarWindow = windows.find((w) => w.url().includes("#/sidebar"));
    const mainWindow = windows.find((w) => !w.url().includes("#/sidebar"));

    const windowConfigs = [
      { name: "sidebar", testId: "sidebar-page", window: sidebarWindow },
      { name: "main", testId: "app-page", window: mainWindow },
    ];

    for (const { name, window } of windowConfigs) {
      expect(window, `${name} window`).toBeDefined();
      if (!window) {
        throw new Error(`${name} window not found`);
      }
    }

    for (const { name, testId, window } of windowConfigs) {
      const locator = window?.locator(`[data-testid="${testId}"]`);
      await locator?.waitFor({
        // Sidebar is hidden during initial setup
        state: name === "sidebar" ? "attached" : "visible",
        timeout: 30_000,
      });
      expect(await locator?.count(), `${name} window has ${testId}`).toBe(1);
    }

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
      expect(exists, `File exists: ${filePath}`).toBe(true);
    }

    // Validate app-state.json has lastMigratedVersion set (migration ran)
    const appStateContent = await fs.readFile(
      path.join(tempUserDataDir, "app-state.json"),
      "utf8",
    );
    const appState = JSON.parse(appStateContent) as {
      lastMigratedVersion?: string;
    };
    expect(appState.lastMigratedVersion).toBeDefined();
    expect(typeof appState.lastMigratedVersion).toBe("string");
    expect(appState.lastMigratedVersion?.length).toBeGreaterThan(0);
  });
});
