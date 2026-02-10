import { z } from "zod";

export namespace FileUpload {
  export const Schema = z.object({
    content: z.string(),
    filename: z.string(),
  });

  export type Type = z.output<typeof Schema>;
}
