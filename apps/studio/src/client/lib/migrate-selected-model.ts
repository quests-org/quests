import { rpcClient } from "@/client/rpc/client";
import { type AIGatewayModelURI } from "@quests/ai-gateway/client";

export async function migrateSelectedModel() {
  const MIGRATION_KEY = "migrations:selected-model-to-server";

  if (localStorage.getItem(MIGRATION_KEY)) {
    return;
  }

  const oldValue = localStorage.getItem("selectedModelURI");
  if (oldValue) {
    try {
      // Must cast b/c we can't use the schema on the client.
      const parsed = JSON.parse(oldValue) as AIGatewayModelURI.Type;
      if (typeof parsed === "string") {
        await rpcClient.preferences.setDefaultModelURI.call({
          modelURI: parsed,
        });
      }
    } catch {
      // Ignore parse/RPC errors during migration
    }
    localStorage.removeItem("selectedModelURI");
  }

  localStorage.setItem(MIGRATION_KEY, "true");
}
