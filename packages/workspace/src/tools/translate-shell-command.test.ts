import { describe, expect, it } from "vitest";

import { translateShellCommand } from "./translate-shell-command";

describe("translateShellCommand", () => {
  it.each([
    {
      command: `tsx -e "console.log('hello from eval!')"`,
      expected: ["tsx", "-e", "console.log('hello from eval!')"],
    },
    {
      command: `pnpm add @types/node`,
      expected: ["pnpm", "add", "@types/node"],
    },
    {
      command: `tsx -e "console.log(\\"hi\\")"`,
      expected: ["tsx", "-e", `console.log("hi")`],
    },
    {
      command: `one\\ two three`,
      expected: ["one two", "three"],
    },
    {
      command: `a 'b c' d`,
      expected: ["a", "b c", "d"],
    },
    {
      command: `a "b c" d`,
      expected: ["a", "b c", "d"],
    },
    {
      command: `pnpm install # this is a comment`,
      expected: ["pnpm", "install"],
    },
    {
      command: `ls src/*.ts`,
      expected: ["ls", "src/*.ts"],
    },
  ])("parses: $command", ({ command, expected }) => {
    const result = translateShellCommand(command);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(expected);
    }
  });

  it.each([
    {
      command: `ls && echo hi`,
      errorMatch: /control operators are not allowed.*&&/i,
    },
    {
      command: `ls | grep test`,
      errorMatch: /control operators are not allowed.*\|/i,
    },
    {
      command: `pnpm install; echo done`,
      errorMatch: /control operators are not allowed.*;/i,
    },
    {
      command: `   `,
      errorMatch: /cannot be empty/i,
    },
  ])("rejects: $command", ({ command, errorMatch }) => {
    const result = translateShellCommand(command);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.message).toMatch(errorMatch);
    }
  });
});
