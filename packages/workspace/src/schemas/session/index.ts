import { z } from "zod";

import { StoreId } from "../store-id";
import { SessionMessage } from "./message";

export namespace Session {
  export const Schema = z.object({
    createdAt: z.date(),
    id: StoreId.SessionSchema,
    parentId: StoreId.SessionSchema.optional(),
    title: z.string(),
    updatedAt: z.date().optional(),
  });

  export type Type = z.output<typeof Session.Schema>;

  export const WithMessagesAndPartsSchema = Schema.extend({
    messages: z.array(SessionMessage.WithPartsSchema),
  });

  export type WithMessagesAndParts = z.output<
    typeof WithMessagesAndPartsSchema
  >;
}
