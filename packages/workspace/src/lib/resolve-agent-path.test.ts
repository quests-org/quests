import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AbsolutePathSchema } from "../schemas/paths";
import { applyUnicodeFallbacks } from "./resolve-agent-path";

function abs(filePath: string) {
  return AbsolutePathSchema.parse(filePath);
}

describe("applyUnicodeFallbacks", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "quests-unicode-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { force: true, recursive: true });
  });

  it("returns the original path when the file exists as-is", async () => {
    const file = path.join(tmpDir, "normal.txt");
    await fs.writeFile(file, "");
    expect(applyUnicodeFallbacks(abs(file))).toBe(file);
  });

  it("returns the original path when no variant exists", () => {
    const file = abs(path.join(tmpDir, "nonexistent.txt"));
    expect(applyUnicodeFallbacks(file)).toBe(file);
  });

  it.each([
    {
      label: "AM screenshot",
      // File on disk uses U+202F (narrow no-break space) before AM
      diskName: `Screenshot 2025-01-01 at 9.00\u202FAM.png`,
      inputName: `Screenshot 2025-01-01 at 9.00 AM.png`,
    },
    {
      diskName: `Screenshot 2025-01-01 at 3.45\u202FPM.png`,
      inputName: `Screenshot 2025-01-01 at 3.45 PM.png`,
      label: "PM screenshot",
    },
  ])(
    "resolves macOS $label filename (U+202F narrow no-break space)",
    async ({ diskName, inputName }) => {
      await fs.writeFile(path.join(tmpDir, diskName), "");
      const input = abs(path.join(tmpDir, inputName));
      const result = applyUnicodeFallbacks(input);
      expect(result).toBe(path.join(tmpDir, diskName));
    },
  );

  it("resolves NFD-encoded filename (macOS decomposed Unicode)", async () => {
    // cspell:ignore APFS
    // Write a file using the NFD form of the name. On APFS the OS normalizes
    // it to NFC on disk, so the NFC input path finds it directly. On HFS+ the
    // OS preserves NFD and the fallback is needed. Either way the returned
    // path must be accessible.
    const nfcName = "caf\u00E9.txt"; // NFC: é as single codepoint
    const nfdName = "cafe\u0301.txt"; // NFD: e + combining acute accent
    await fs.writeFile(path.join(tmpDir, nfdName), "");
    const input = abs(path.join(tmpDir, nfcName));
    const result = applyUnicodeFallbacks(input);
    await expect(fs.access(result)).resolves.toBeUndefined();
  });

  it("resolves curly apostrophe in filename (macOS U+2019)", async () => {
    // cspell:ignore d'écran cran
    // macOS uses U+2019 in names like "Capture d'écran"
    const diskName = "Capture d\u2019\u00E9cran.png";
    const inputName = "Capture d'écran.png";
    await fs.writeFile(path.join(tmpDir, diskName), "");
    const input = abs(path.join(tmpDir, inputName));
    const result = applyUnicodeFallbacks(input);
    expect(result).toBe(path.join(tmpDir, diskName));
  });

  it("resolves combined NFD + curly apostrophe (French macOS screenshot)", async () => {
    // French macOS: NFD-encoded é AND curly apostrophe.
    // The OS may normalize the NFD part on disk; what matters is the file is found.
    const diskName = `Capture d\u2019e\u0301cran.png`; // NFD + U+2019
    const inputName = `Capture d'écran.png`; // NFC + straight apostrophe
    await fs.writeFile(path.join(tmpDir, diskName), "");
    const input = abs(path.join(tmpDir, inputName));
    const result = applyUnicodeFallbacks(input);
    expect(result).not.toBe(input);
    await expect(fs.access(result)).resolves.toBeUndefined();
  });
});
