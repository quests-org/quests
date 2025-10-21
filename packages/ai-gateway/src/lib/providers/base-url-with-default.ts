import { type AIGatewayProviderConfig } from "../../schemas/provider-config";
import { getProviderMetadata } from "./metadata";

export function baseURLWithDefault(
  config: Pick<AIGatewayProviderConfig.Type, "baseURL" | "type">,
) {
  return config.baseURL ?? getProviderMetadata(config.type).api.defaultBaseURL;
}
