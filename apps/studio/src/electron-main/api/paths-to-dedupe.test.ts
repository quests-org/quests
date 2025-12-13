import { get } from "radashi";
import { describe, expect, it } from "vitest";

import { contract } from "./contract";
import { PATHS_TO_DEDUPE } from "./paths-to-dedupe";

describe("PATHS_TO_DEDUPE", () => {
  it.each(PATHS_TO_DEDUPE.map((path) => path.join(".")))(
    "%s should resolve to a valid RPC endpoint",
    (path) => {
      const endpoint: object | undefined = get(contract, path);
      expect(endpoint && "~orpc" in endpoint).toBe(true);
    },
  );
});
