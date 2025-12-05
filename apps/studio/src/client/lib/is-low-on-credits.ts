import { type AsyncGeneratorYield, type RPCOutput } from "@/client/rpc/client";

type Subscription = AsyncGeneratorYield<
  RPCOutput["user"]["live"]["subscription"]
>;

export function isLowOnCredits(
  data: Subscription["data"] | undefined,
): boolean {
  if (!data) {
    return false;
  }
  const displayUsagePercent = data.plan
    ? data.usagePercent
    : data.freeUsagePercent;
  return displayUsagePercent > 90;
}
