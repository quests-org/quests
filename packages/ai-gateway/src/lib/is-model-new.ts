import { isAfter, subDays } from "date-fns";

import { parseModelDate } from "./parse-model-date";

export function isModelNew(createdDate: number | string | undefined): boolean {
  const parsedDate = parseModelDate(createdDate);
  if (parsedDate.getTime() === 0) {
    return false;
  }

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);

  return isAfter(parsedDate, thirtyDaysAgo);
}
