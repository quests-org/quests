import { monotonicFactory } from "ulid";
import { z } from "zod";

const ulid = monotonicFactory();

const PREFIXES = {
  message: "msg_",
  part: "prt_",
  session: "ses_",
} as const;

// via https://github.com/colinhacks/zod/blob/2c333e268c316deef829c736b8c46ec95ee03e39/packages/zod/src/v4/core/regexes.ts#L3
// cspell:ignore HJKMNP
const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

function createIdSchema<T extends string>(prefix: string, brandName: T) {
  return z
    .string()
    .startsWith(prefix)
    .check((ctx) => {
      const withoutPrefix = ctx.value.slice(prefix.length);
      if (!ULID_REGEX.test(withoutPrefix)) {
        ctx.issues.push({
          code: "custom",
          input: ctx.value,
          message: "Must be a valid ULID after prefix",
        });
      }
    })
    .brand(brandName);
}

export namespace StoreId {
  export const SessionSchema = createIdSchema(PREFIXES.session, "SessionId");
  export type Session = z.output<typeof SessionSchema>;

  export const MessageSchema = createIdSchema(
    PREFIXES.message,
    "SessionMessageId",
  );
  export type Message = z.output<typeof MessageSchema>;

  export const PartSchema = createIdSchema(
    PREFIXES.part,
    "SessionMessagePartId",
  );
  export type Part = z.output<typeof PartSchema>;

  export const ToolCallSchema = z.string().brand("ToolCallId");
  export type ToolCall = z.output<typeof ToolCallSchema>;

  export function newMessageId() {
    return StoreId.MessageSchema.parse(`${PREFIXES.message}${ulid()}`);
  }

  export function newPartId() {
    return StoreId.PartSchema.parse(`${PREFIXES.part}${ulid()}`);
  }

  export function newSessionId() {
    return StoreId.SessionSchema.parse(`${PREFIXES.session}${ulid()}`);
  }
}
