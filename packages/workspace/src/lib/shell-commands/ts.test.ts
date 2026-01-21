import { describe, expect, it } from "vitest";

import { ProjectSubdomainSchema } from "../../schemas/subdomains";
import { createMockAppConfig } from "../../test/helpers/mock-app-config";
import { tsCommand } from "./ts";

describe("tsCommand", () => {
  const appConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"));

  it("errors when no file argument provided", async () => {
    const result = await tsCommand([], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "ts command requires a file argument (e.g., ts scripts/setup.ts). Running ts without arguments spawns an interactive shell.",
        "type": "execute-error",
      }
    `);
  });

  it("errors when -e flag is used", async () => {
    const result = await tsCommand(["-e", "console.log('test')"], appConfig);

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "ts does not support the -e/--eval flag for evaluating code strings directly. Instead, write your code to a .ts or .js file and execute it with ts.",
        "type": "execute-error",
      }
    `);
  });

  it("errors when --eval flag is used", async () => {
    const result = await tsCommand(
      ["--eval", "console.log('test')"],
      appConfig,
    );

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "ts does not support the -e/--eval flag for evaluating code strings directly. Instead, write your code to a .ts or .js file and execute it with ts.",
        "type": "execute-error",
      }
    `);
  });

  it("errors when multiple files are provided", async () => {
    const result = await tsCommand(
      ["script1.ts", "script2.ts", "script3.ts"],
      appConfig,
    );

    expect(result._unsafeUnwrapErr()).toMatchInlineSnapshot(`
      {
        "message": "ts only supports executing one file at a time. Found 3 files: script1.ts, script2.ts, script3.ts. Execute them separately or combine into a single script.",
        "type": "execute-error",
      }
    `);
  });
});
