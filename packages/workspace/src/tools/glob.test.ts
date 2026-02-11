import mockFs from "mock-fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { createMockAIGatewayModel } from "../test/helpers/mock-ai-gateway-model";
import {
  createMockAppConfig,
  MOCK_WORKSPACE_DIRS,
} from "../test/helpers/mock-app-config";
import { TOOLS } from "./all";

vi.mock(import("ulid"));
vi.mock(import("../lib/session-store-storage"));
vi.mock(import("../lib/get-current-date"));

describe("Glob", () => {
  const model = createMockAIGatewayModel();
  const projectAppConfig = createMockAppConfig(
    ProjectSubdomainSchema.parse("test"),
    { model },
  );

  beforeEach(() => {
    mockFs({
      [MOCK_WORKSPACE_DIRS.projects]: {
        [projectAppConfig.folderName]: {
          ".gitignore": "node_modules",
          folder: {
            "other2.txt": "other2",
            "test3.txt": "test3",
          },
          "other.txt": "other",
          "test1.txt": "test1",
          "test2.txt": "test2",
        },
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it.each([
    {
      expectedFiles: ["test1.txt", "test2.txt"],
      name: "with basic pattern",
      pattern: "test*.txt",
    },
    {
      expectedFiles: ["folder/test3.txt", "test1.txt", "test2.txt"],
      name: "with recursive pattern",
      pattern: "**/test*.txt",
    },
  ])(
    "should find files matching a glob pattern $name",
    async ({ expectedFiles, pattern }) => {
      const result = await TOOLS.Glob.execute({
        agentName: "main",
        appConfig: projectAppConfig,
        input: {
          explanation: "I want to find all test files",
          pattern,
        },
        model,
        signal: AbortSignal.timeout(10_000),
        spawnAgent: vi.fn(),
      });

      expect(result._unsafeUnwrap().files).toEqual(expectedFiles);
    },
  );
});
