import { Result } from "typescript-result";
import { z } from "zod";

import { getProviderAdapter } from "../adapters/all";
import { type AIGatewayProvider } from "../schemas/provider";
import { TypedError } from "./errors";

const OpenRouterCreditsResponseSchema = z.object({
  data: z.object({
    total_credits: z.number(),
    total_usage: z.number(),
  }),
});

export function fetchCredits(provider: AIGatewayProvider.Type) {
  return Result.gen(function* () {
    if (provider.type !== "openrouter") {
      yield* Result.error(
        new TypedError.NotFound("Only openrouter supports fetching credits"),
      );
    }
    const adapter = getProviderAdapter(provider.type);

    return Result.fromAsync(async () => {
      const headers = new Headers({ "Content-Type": "application/json" });
      adapter.setAuthHeaders(headers, provider.apiKey);
      const url = new URL(
        adapter.buildURL({ baseURL: provider.baseURL, path: "/v1/credits" }),
      );

      const result = Result.try(
        async () => {
          const response = await fetch(url.toString(), { headers });
          if (!response.ok) {
            throw new Error("Failed to fetch credits");
          }
          const creditsData = OpenRouterCreditsResponseSchema.parse(
            await response.json(),
          );

          return creditsData.data;
        },
        (error) =>
          new TypedError.Fetch("Failed to fetch credits", {
            cause: error,
          }),
      );
      return result;
    });
  });
}
