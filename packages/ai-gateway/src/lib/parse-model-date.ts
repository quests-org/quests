import { isValid, parseISO } from "date-fns";

export function parseModelDate(date: number | string | undefined): Date {
  if (!date) {
    return new Date(0);
  }
  const parsed =
    typeof date === "string" ? parseISO(date) : new Date(date * 1000);
  return isValid(parsed) ? parsed : new Date(0);
}
