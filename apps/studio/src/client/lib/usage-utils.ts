export function isValidNumber(value: number | undefined): value is number {
  return value !== undefined && !Number.isNaN(value);
}

export function safeAdd(a: number | undefined, b: number | undefined): number {
  return (isValidNumber(a) ? a : 0) + (isValidNumber(b) ? b : 0);
}
