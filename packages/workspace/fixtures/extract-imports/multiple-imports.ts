import z from "zod";
import { object, string } from "zod";

import * as ToImport from "./to-import.js";

export function main() {
  const test = ToImport.toImport();
  console.log(test);
  const schema1 = z.number();
  const schema2 = object({
    a: z.string(),
    b: z.string(),
    c: z.string(),
  });
  const schema3 = string();
  const result = schema1.parse(1);
  const result2 = schema2.parse({ a: "a", b: "b", c: "c" });
  const result3 = schema3.parse("hello");
  console.log(result);
  console.log(result2);
  console.log(result3);
}
