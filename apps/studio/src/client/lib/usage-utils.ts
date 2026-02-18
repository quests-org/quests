export function isValidNumber(value: number | undefined): value is number {
  return value !== undefined && !Number.isNaN(value);
}
