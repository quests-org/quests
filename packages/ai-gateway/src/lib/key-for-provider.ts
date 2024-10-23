import { randomBytes } from "node:crypto";

const INTERNAL_KEY = `quests-internal-${randomBytes(32).toString("hex")}`;

export function getInternalKey(): string {
  return INTERNAL_KEY;
}

export function internalAPIKey(): string {
  return getInternalKey();
}
