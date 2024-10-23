export function mergeGenerators<T>(
  generators: AsyncGenerator<T>[],
): AsyncGenerator<T>;
export function mergeGenerators<T, U = T>(
  generators: AsyncGenerator<T>[],
  mapResult: (result: IteratorResult<T>) => U,
): AsyncGenerator<NonNullable<U>>;
export async function* mergeGenerators<T, U>(
  generators: AsyncGenerator<T>[],
  mapResult?: (result: IteratorResult<T>, index: number) => U,
) {
  type IteratorPromise = Promise<{
    index: number;
    result: IteratorResult<T>;
  }>;

  const promises: (IteratorPromise | null)[] = generators.map((gen, index) =>
    gen.next().then((result) => ({ index, result })),
  );

  while (promises.some(Boolean)) {
    const promise = await Promise.race(promises.filter(Boolean));
    if (!promise) {
      continue;
    }

    const { index, result } = promise;

    if (mapResult) {
      const value = mapResult(result, index);
      if (value != null) {
        yield value;
      }
    } else if (!result.done) {
      yield result.value;
    }

    promises[index] = result.done
      ? null
      : (generators[index]?.next().then((r) => ({ index, result: r })) ?? null);
  }
}
