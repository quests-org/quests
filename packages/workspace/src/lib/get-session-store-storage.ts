import { createDatabase } from "db0";
import sqlite from "db0/connectors/node-sqlite";
import { ok, ResultAsync } from "neverthrow";
import fs from "node:fs";
import { createStorage } from "unstorage";
import dbDriver from "unstorage/drivers/db0";

import { SESSIONS_TABLE_NAME } from "../constants";
import { type AppConfig } from "./app-config/types";
import { sessionStorePath } from "./app-dir-utils";

// Avoids possible SQLite database lock errors if we create the same storage
// multiple times.
const STORAGE_CACHE = new Map<string, ReturnType<typeof createStorage>>();

export function getSessionsStoreStorage(appConfig: AppConfig) {
  return ResultAsync.fromPromise(fs.promises.access(appConfig.appDir), () => ({
    message: `Folder ${appConfig.appDir} does not exist`,
    type: "not-found" as const,
  }))
    .andThen(() => {
      const existingStorage = STORAGE_CACHE.get(appConfig.subdomain);
      if (existingStorage) {
        return ok(existingStorage);
      }

      const database = createDatabase(
        sqlite({ path: sessionStorePath(appConfig.appDir) }),
      );

      const storage = createStorage({
        driver: dbDriver({
          database,
          tableName: SESSIONS_TABLE_NAME,
        }),
      });

      STORAGE_CACHE.set(appConfig.subdomain, storage);
      return ok(storage);
    })
    .orTee(() => {
      STORAGE_CACHE.delete(appConfig.subdomain);
    });
}
