import { vi } from "vitest";

const mockApp = {
  getPath: vi.fn((name: string) => {
    if (name === "userData") {
      return "/mock/user/data/path";
    }
    return "/mock/path";
  }),
};

const mockSafeStorage = {
  isEncryptionAvailable: vi.fn().mockReturnValue(false),
};

const mockShell = {
  openExternal: vi.fn(),
};

export const app = mockApp;
export const safeStorage = mockSafeStorage;
export const shell = mockShell;
