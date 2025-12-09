import { type Subscription } from "@/electron-main/api/client";

export function isLowOnCredits(data: null | Subscription | undefined): boolean {
  if (!data) {
    return false;
  }
  const displayUsagePercent = data.plan
    ? data.usagePercent
    : data.freeUsagePercent;
  return displayUsagePercent > 90;
}
