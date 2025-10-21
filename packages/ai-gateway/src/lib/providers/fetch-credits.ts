import { Result } from "typescript-result";
import { z } from "zod";

import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { TypedError } from "../errors";
import { apiURL } from "./api-url";
import { setProviderAuthHeaders } from "./set-auth-headers";

const OpenRouterCreditsResponseSchema = z.object({
  data: z.object({
    total_credits: z.number(),
    total_usage: z.number(),
  }),
});

export function fetchCredits(
  config: Pick<AIGatewayProviderConfig.Type, "apiKey" | "baseURL" | "type">,
) {
  if (config.type !== "openrouter") {
    return Result.error(
      new TypedError.Fetch(
        `Credits fetching is not supported for provider: ${config.type}`,
      ),
    );
  }

  return Result.fromAsync(async () => {
    const headers = new Headers({ "Content-Type": "application/json" });
    setProviderAuthHeaders(headers, config);

    const url = apiURL({ config, path: "/credits" });

    const result = Result.try(
      async () => {
        const response = await fetch(url, { headers });
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
}
