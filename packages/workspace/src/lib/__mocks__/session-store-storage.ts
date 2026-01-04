import { ok } from "neverthrow";
import { createStorage } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";
import { beforeEach } from "vitest";

import { wrapStorage } from "../wrap-storage";

const mockStorage = createStorage({
  driver: memoryDriver(),
});

const wrappedMockStorage = wrapStorage(mockStorage);

export function getSessionsStoreStorage() {
  return ok(wrappedMockStorage);
}

beforeEach(async () => {
  await mockStorage.clear();
});
