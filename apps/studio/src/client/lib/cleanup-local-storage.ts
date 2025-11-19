// Removes the old client-side storage for prompt values.
// We moved these out of the client because they could overflow the localStorage
// limit.
export function cleanupPromptValueStorage() {
  const MIGRATION_KEY = "migrations:prompt-value-cleanup";

  if (localStorage.getItem(MIGRATION_KEY)) {
    return;
  }

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("prompt-value-")) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }

  localStorage.setItem(MIGRATION_KEY, "true");
}
