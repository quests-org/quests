import z, { object } from "zod";

export function main() {
  const schema = object({
    a: z.string(),
    b: z.string(),
    c: z.string(),
  });
  const result = schema.parse({ a: "a", b: "b", c: "c" });
  console.log(result);
}
