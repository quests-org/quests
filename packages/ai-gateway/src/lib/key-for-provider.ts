import { randomBytes } from "node:crypto";

const INTERNAL_KEY_PREFIX = "quests-internal-";

const INTERNAL_KEY = `${INTERNAL_KEY_PREFIX}${randomBytes(32).toString("hex")}`;

export function getInternalKey(): string {
  return INTERNAL_KEY;
}

export function internalAPIKey(): string {
  return getInternalKey();
}
