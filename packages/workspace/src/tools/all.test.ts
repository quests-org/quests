import { err, ok, type Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { TOOLS } from "./all";

// Recursively check parameterSchema for descriptions and throw an error if
// any are missing
function hasDescription(
  schema: z.ZodType,
  currentPath: string[] = [],
): Result<null, { key: string; path: string }> {
  // Check if the current schema has a description
  if (schema.meta()?.description) {
    return ok(null);
  }

  // Handle ZodObject schemas
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;

    for (const [key, value] of Object.entries(shape)) {
      if (value instanceof z.ZodType) {
        const result = hasDescription(value, [...currentPath, key]);
        if (result.isErr()) {
          return err(result.error);
        }
      }
    }
    return ok(null);
  }

  // Handle ZodDiscriminatedUnion schemas
  if (schema instanceof z.ZodDiscriminatedUnion) {
    const options = schema.options;
    for (const option of options) {
      const result = hasDescription(option as z.ZodType, [
        ...currentPath,
        "option",
      ]);
      if (result.isErr()) {
        return err(result.error);
      }
    }
    return ok(null);
  }

  // If we get here, the schema doesn't have a description and isn't a container type
  return err({
    key: schema.constructor.name,
    path: currentPath.join(".") || "root",
  });
}

describe("all", () => {
  describe("parameterSchema", () => {
    it.each(
      Object.entries(TOOLS).filter(([_, tool]) => tool.name !== "unavailable"),
    )("should have descriptions for all types in %s", (toolName, tool) => {
      const result = hasDescription(tool.inputSchema);
      expect(
        result.isOk(),
        // eslint-disable-next-line vitest/valid-expect
        result.isErr()
          ? `Missing description in ${toolName} at ${result.error.path} for ${result.error.key}`
          : "Expected schema to have descriptions",
      ).toBe(true);
    });
  });
});
