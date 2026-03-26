/** Pick the first string value from a set of aliased parseArgs values. */
export function firstString(
  ...values: ((boolean | string)[] | boolean | string | undefined)[]
): string | undefined {
  return values.find((v): v is string => typeof v === "string");
}

/** Extract a string array from a parseArgs multi-value option. */
export function stringArray(
  value: (boolean | string)[] | boolean | string | undefined,
): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}
