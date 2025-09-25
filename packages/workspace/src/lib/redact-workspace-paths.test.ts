import { describe, expect, it } from "vitest";

import { type AppConfig } from "./app-config/types";
import { redactWorkspacePaths } from "./redact-workspace-paths";

describe("redactWorkspacePaths", () => {
  const mockAppConfig: AppConfig = {
    appDir:
      "/Users/test/Library/Application Support/Quests (Dev)/workspace/projects/test",
    // other properties would be here in real config
  } as AppConfig;

  it("redacts literal workspace paths", () => {
    const message =
      "Error in /Users/test/Library/Application Support/Quests (Dev)/workspace/projects/test/file.js";
    const result = redactWorkspacePaths(message, mockAppConfig);
    expect(result).toBe("Error in /file.js");
  });

  it("redacts URL-encoded workspace paths", () => {
    const message =
      "file:///Users/test/Library/Application%20Support/Quests%20(Dev)/workspace/projects/test/node_modules/.pnpm/vite@7.1.3_@types+node@22.17.2_jiti@2.5.1_lightningcss@1.30.1/node_modules/vite/dist/node/module-runner.js";
    const result = redactWorkspacePaths(message, mockAppConfig);
    expect(result).toBe(
      "file:///node_modules/.pnpm/vite@7.1.3_@types+node@22.17.2_jiti@2.5.1_lightningcss@1.30.1/node_modules/vite/dist/node/module-runner.js",
    );
  });

  it("redacts multiple occurrences", () => {
    const message =
      "Error at /Users/test/Library/Application Support/Quests (Dev)/workspace/projects/test/file1.js and file:/Users/test/Library/Application%20Support/Quests%20(Dev)/workspace/projects/test/file2.js";
    const result = redactWorkspacePaths(message, mockAppConfig);
    expect(result).toBe("Error at /file1.js and file:/file2.js");
  });

  it("handles mixed encoding within the same message", () => {
    const message =
      "Loading /Users/test/Library/Application Support/Quests (Dev)/workspace/projects/test/src/index.ts and file:/Users/test/Library/Application%20Support/Quests%20(Dev)/workspace/projects/test/src/main.ts";
    const result = redactWorkspacePaths(message, mockAppConfig);
    expect(result).toBe("Loading /src/index.ts and file:/src/main.ts");
  });

  it("does not affect unrelated paths", () => {
    const message = "Error in /some/other/path/file.js";
    const result = redactWorkspacePaths(message, mockAppConfig);
    expect(result).toBe("Error in /some/other/path/file.js");
  });
});
