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

describe("WriteFile - scriptsDirectoryReminder in toModelOutput", () => {
  afterEach(() => {
    mockFs.restore();
  });

  it("includes pnpm reminder for a script file", async () => {
    mockFs({ [MOCK_WORKSPACE_DIRS.projects]: { [appConfig.folderName]: {} } });

    const input = {
      content: "console.log('hello')",
      explanation: "test",
      filePath: "./scripts/hello.ts",
    };
    const result = await runTool(WriteFile, makeExecuteArgs(input));
    const output = result._unsafeUnwrap();
    expect(WriteFile.toModelOutput({ input, output, toolCallId: "test" }))
      .toMatchInlineSnapshot(`
        {
          "type": "text",
          "value": "Successfully wrote new file ./scripts/hello.ts

        Run \`tsc --noEmit\` using the \`bash\` tool to check for type errors before finishing.

        Before running this script, add any new dependencies using the bash tool with the pnpm command.",
        }
      `);
  });

  it("includes pathToFileURL reminder when script uses import.meta.url", async () => {
    mockFs({ [MOCK_WORKSPACE_DIRS.projects]: { [appConfig.folderName]: {} } });

    const input = {
      content: "if (import.meta.url === `file://${process.argv[1]}`) {}",
      explanation: "test",
      filePath: "./scripts/cli.ts",
    };
    const result = await runTool(WriteFile, makeExecuteArgs(input));
    const output = result._unsafeUnwrap();
    expect(WriteFile.toModelOutput({ input, output, toolCallId: "test" }))
      .toMatchInlineSnapshot(`
        {
          "type": "text",
          "value": "Successfully wrote new file ./scripts/cli.ts

        Run \`tsc --noEmit\` using the \`bash\` tool to check for type errors before finishing.

        Before running this script, add any new dependencies using the bash tool with the pnpm command.

        If checking whether this script is the main module, use \`pathToFileURL(process.argv[1]).href\` from \`node:url\` instead of \`\`file://\${process.argv[1]}\`\` -- the latter breaks on paths with spaces.",
        }
      `);
  });

  it("does not include pathToFileURL reminder when script does not use import.meta.url", async () => {
    mockFs({ [MOCK_WORKSPACE_DIRS.projects]: { [appConfig.folderName]: {} } });

    const input = {
      content: "console.log('no meta url here')",
      explanation: "test",
      filePath: "./scripts/simple.ts",
    };
    const result = await runTool(WriteFile, makeExecuteArgs(input));
    const output = result._unsafeUnwrap();
    expect(WriteFile.toModelOutput({ input, output, toolCallId: "test" }))
      .toMatchInlineSnapshot(`
        {
          "type": "text",
          "value": "Successfully wrote new file ./scripts/simple.ts

        Run \`tsc --noEmit\` using the \`bash\` tool to check for type errors before finishing.

        Before running this script, add any new dependencies using the bash tool with the pnpm command.",
        }
      `);
  });

  it("includes pathToFileURL reminder for a skill script using import.meta.url", async () => {
    mockFs({ [MOCK_WORKSPACE_DIRS.projects]: { [appConfig.folderName]: {} } });

    const input = {
      content: "if (import.meta.url === `file://${process.argv[1]}`) {}",
      explanation: "test",
      filePath: "./skills/my-skill/scripts/cli.ts",
    };
    const result = await runTool(WriteFile, makeExecuteArgs(input));
    const output = result._unsafeUnwrap();
    expect(WriteFile.toModelOutput({ input, output, toolCallId: "test" }))
      .toMatchInlineSnapshot(`
        {
          "type": "text",
          "value": "Successfully wrote new file ./skills/my-skill/scripts/cli.ts

        Run \`cd skills/my-skill && tsc --noEmit\` using the \`bash\` tool to check for type errors before finishing.

        If checking whether this script is the main module, use \`pathToFileURL(process.argv[1]).href\` from \`node:url\` instead of \`\`file://\${process.argv[1]}\`\` -- the latter breaks on paths with spaces.",
        }
      `);
  });

  it("does not include scripts reminder for non-scripts directory", async () => {
    mockFs({ [MOCK_WORKSPACE_DIRS.projects]: { [appConfig.folderName]: {} } });

    const input = {
      content: "console.log('no meta url here')",
      explanation: "test",
      filePath: "./src/util.ts",
    };
    const result = await runTool(WriteFile, makeExecuteArgs(input));
    const output = result._unsafeUnwrap();
    expect(WriteFile.toModelOutput({ input, output, toolCallId: "test" }))
      .toMatchInlineSnapshot(`
        {
          "type": "text",
          "value": "Successfully wrote new file ./src/util.ts

        Run \`tsc --noEmit\` using the \`bash\` tool to check for type errors before finishing.",
        }
      `);
  });
});

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
