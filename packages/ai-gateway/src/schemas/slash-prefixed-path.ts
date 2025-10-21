import { z } from "zod";

export const SlashPrefixedPathSchema = z.custom<`/${string}`>(
  (path) => typeof path === "string" && path.startsWith("/"),
);
