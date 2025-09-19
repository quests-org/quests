import { createDatabase } from "db0";
import sqlite from "db0/connectors/node-sqlite";
import { ok, ResultAsync } from "neverthrow";
import fs from "node:fs/promises";
import { createStorage } from "unstorage";
import dbDriver from "unstorage/drivers/db0";

import { SESSIONS_TABLE_NAME } from "../constants";
import { type AppSubdomain } from "../schemas/subdomains";
import { type AppConfig } from "./app-config/types";
import { sessionStorePath } from "./app-dir-utils";
import { TypedError } from "./errors";

// Avoids possible SQLite database lock errors if we create the same storage
// multiple times.
const STORAGE_CACHE = new Map<AppSubdomain, ReturnType<typeof createStorage>>();

export function disposeSessionsStoreStorage(subdomain: AppSubdomain) {
  return ResultAsync.fromPromise(
    (async () => {
      const storage = STORAGE_CACHE.get(subdomain);
      if (storage) {
        await storage.dispose();
        STORAGE_CACHE.delete(subdomain);
      }
      return ok(undefined);
    })(),
    (error: unknown) =>
      new TypedError.Storage(
        error instanceof Error ? error.message : "Unknown error",
        { cause: error },
      ),
  );
}

export function getSessionsStoreStorage(appConfig: AppConfig) {
  return ResultAsync.fromPromise(
    fs.access(appConfig.appDir),
    (error) =>
      new TypedError.NotFound(`Folder ${appConfig.appDir} does not exist`, {
        cause: error,
      }),
  )
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
