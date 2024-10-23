import { ok } from "neverthrow";
import { createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";
import { beforeEach } from "vitest";

const mockStorage = createStorage({
  driver: memoryDriver(),
});

export function getSessionsStoreStorage() {
  return ok(mockStorage);
}

beforeEach(async () => {
  await mockStorage.clear();
});
