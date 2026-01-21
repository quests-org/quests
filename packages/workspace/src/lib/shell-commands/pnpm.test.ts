import { describe, expect, it } from "vitest";

import { ProjectSubdomainSchema } from "../../schemas/subdomains";
import { createMockAppConfig } from "../../test/helpers/mock-app-config";
import { pnpmCommand } from "./pnpm";

describe("pnpmCommand", () => {
  const appConfig = createMockAppConfig(ProjectSubdomainSchema.parse("test"));

  it.each([{ subcommand: "dev" }, { subcommand: "start" }])(
    "errors when trying to run pnpm $subcommand",
    async ({ subcommand }) => {
      const result = await pnpmCommand([subcommand], appConfig);

      const error = result._unsafeUnwrapErr();
      expect(error.message).toBe(
        `Quests already starts and runs the apps for you. You don't need to run 'pnpm ${subcommand}'.`,
      );
      expect(error.type).toBe("execute-error");
    },
  );

  it.each([{ subcommand: "dev" }, { subcommand: "start" }])(
    "errors when trying to run pnpm run $subcommand",
    async ({ subcommand }) => {
      const result = await pnpmCommand(["run", subcommand], appConfig);

      const error = result._unsafeUnwrapErr();
      expect(error.message).toBe(
        `Quests already starts and runs the apps for you. You don't need to run 'pnpm run ${subcommand}'.`,
      );
      expect(error.type).toBe("execute-error");
    },
  );
});
