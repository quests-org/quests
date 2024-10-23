import { isAfter, isValid, parseISO, subDays } from "date-fns";

export function isModelNew(createdDate: number | string | undefined): boolean {
  if (!createdDate) {
    return false;
  }

  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);

  const parsedDate =
    typeof createdDate === "string"
      ? parseISO(createdDate)
      : new Date(createdDate * 1000);

  return isValid(parsedDate) && isAfter(parsedDate, thirtyDaysAgo);
}
