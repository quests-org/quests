import { type RPCOutput } from "@/client/rpc/client";

type SubscriptionStatus =
  RPCOutput["user"]["live"]["subscriptionStatus"] extends AsyncGenerator<
    infer T
  >
    ? T
    : never;

export function isPayingUser(subscriptionStatus: SubscriptionStatus): boolean {
  if (!subscriptionStatus) {
    return false;
  }
  return subscriptionStatus.plan !== null;
}
