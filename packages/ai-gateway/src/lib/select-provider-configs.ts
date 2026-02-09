import { type AIGatewayProviderConfig } from "../schemas/provider-config";

/**
 * Selects an ordered list of up to `maxConfigs` provider configs to try,
 * given a preferred config and a priority-ordered list of supported provider types.
 */
export function selectProviderConfigs<
  T extends AIGatewayProviderConfig.Type = AIGatewayProviderConfig.Type,
>({
  configs,
  maxConfigs = 2,
  preferredProviderConfig,
  providerTypePriority,
}: {
  configs: T[];
  maxConfigs?: number;
  preferredProviderConfig: AIGatewayProviderConfig.Type;
  providerTypePriority: T["type"][];
}): T[] {
  const supportedTypes = new Set<string>(providerTypePriority);
  const isSupported = (type: string) => supportedTypes.has(type);

  const result: T[] = [];

  // 1. Try exact ID match first
  const exactMatch = configs.find(
    (c) => c.id === preferredProviderConfig.id && isSupported(c.type),
  );
  if (exactMatch) {
    result.push(exactMatch);
  }

  // 2. Try type match if no exact match
  if (!exactMatch) {
    const configsByType = new Map(configs.map((c) => [c.type, c]));
    const typeMatch = configsByType.get(preferredProviderConfig.type);
    if (typeMatch && isSupported(typeMatch.type)) {
      result.push(typeMatch);
    }
  }

  // 3. Add fallback(s) from ordered provider list to reach maxConfigs
  for (const providerType of providerTypePriority) {
    if (result.length >= maxConfigs) {
      break;
    }

    const config = configs.find(
      (c) => c.type === providerType && !result.some((c2) => c2.id === c.id),
    );
    if (config) {
      result.push(config);
    }
  }

  return result;
}
