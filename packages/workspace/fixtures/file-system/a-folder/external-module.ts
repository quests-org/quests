import { object, string } from "zod";

export const test = object({
  a: string(),
  b: string(),
  c: string(),
});
