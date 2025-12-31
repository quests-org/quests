import { describe, expect, it } from "vitest";

import { formatPackageDependencies } from "./format-package-dependencies";

describe("formatPackageDependencies", () => {
  it("formats package dependencies into concise summary", () => {
    const result = formatPackageDependencies({
      dependencies: {
        react: "^18.0.0",
        "react-dom": "^18.0.0",
      },
      devDependencies: {
        typescript: "^5.0.0",
        vite: "^5.0.0",
      },
    });

    expect(result).toMatchInlineSnapshot(`
      "dependencies:
      - react@^18.0.0
      - react-dom@^18.0.0
      devDependencies:
      - typescript@^5.0.0
      - vite@^5.0.0"
    `);
  });
});
