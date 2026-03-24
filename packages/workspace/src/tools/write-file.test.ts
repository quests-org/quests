import mockFs from "mock-fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { createMockAIGatewayModel } from "../test/helpers/mock-ai-gateway-model";
import {
  createMockAppConfig,
  MOCK_WORKSPACE_DIRS,
} from "../test/helpers/mock-app-config";
import { runTool } from "../test/helpers/run-tool";
import { WriteFile } from "./write-file";

const model = createMockAIGatewayModel();
const appConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"), {
  model,
});

function makeExecuteArgs(
  input: Parameters<typeof WriteFile.execute>[0]["input"],
) {
  return {
    agentName: "main" as const,
    appConfig,
    input,
    model,
    projectState: {},
    signal: AbortSignal.timeout(10_000),
    spawnAgent: vi.fn(),
  };
}

describe("WriteFile - checkReminder in toModelOutput", () => {
  afterEach(() => {
    mockFs.restore();
  });

  it("should include tsc --noEmit reminder for a root TypeScript file", async () => {
    mockFs({ [MOCK_WORKSPACE_DIRS.projects]: { [appConfig.folderName]: {} } });

    const input = {
      content: "const x = 2;",
      explanation: "test",
      filePath: "./index.ts",
    };
    const result = await runTool(WriteFile, makeExecuteArgs(input));

    const output = result._unsafeUnwrap();
    expect(WriteFile.toModelOutput({ input, output, toolCallId: "test" }))
      .toMatchInlineSnapshot(`
        {
          "type": "text",
          "value": "Successfully wrote new file ./index.ts

        Run \`tsc --noEmit\` using the \`bash\` tool to check for type errors before finishing.",
        }
      `);
  });

  it("should include skill-scoped tsc reminder for a TypeScript file inside a skill folder", async () => {
    mockFs({
      [MOCK_WORKSPACE_DIRS.projects]: {
        [appConfig.folderName]: {
          skills: {
            "my-skill": {
              "tsconfig.json": "{}",
            },
          },
        },
      },
    });

    const input = {
      content: "const x = 2;",
      explanation: "test",
      filePath: "./skills/my-skill/scripts/test.ts",
    };
    const result = await runTool(WriteFile, makeExecuteArgs(input));

    const output = result._unsafeUnwrap();
    expect(WriteFile.toModelOutput({ input, output, toolCallId: "test" }))
      .toMatchInlineSnapshot(`
        {
          "type": "text",
          "value": "Successfully wrote new file ./skills/my-skill/scripts/test.ts

        Run \`cd skills/my-skill && tsc --noEmit\` using the \`bash\` tool to check for type errors before finishing.",
        }
      `);
  });
});
