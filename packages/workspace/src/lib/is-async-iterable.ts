export function isAsyncIterable<T>(value: unknown): value is AsyncGenerator<T> {
  return typeof (value as AsyncGenerator)[Symbol.asyncIterator] === "function";
}
