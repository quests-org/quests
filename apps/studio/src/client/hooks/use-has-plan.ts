import { useLiveSubscriptionStatus } from "./use-live-subscription-status";

export function useHasPlan(): boolean {
  const { data: subscriptionStatus } = useLiveSubscriptionStatus();
  if (!subscriptionStatus) {
    return false;
  }
  return subscriptionStatus.plan !== null;
}
