export function mergeGenerators<T extends readonly unknown[]>(generators: {
  [K in keyof T]: AsyncGenerator<T[K]>;
}): AsyncGenerator<T[number]>;
export function mergeGenerators<T>(
  generators: AsyncGenerator<T>[],
): AsyncGenerator<T>;
export function mergeGenerators<T, U = T>(
  generators: AsyncGenerator<T>[],
  mapResult: (result: IteratorResult<T>, index: number) => U,
): AsyncGenerator<NonNullable<U>>;
export async function* mergeGenerators<T, U>(
  generators: AsyncGenerator<T>[] | { [K in keyof T]: AsyncGenerator<T[K]> },
  mapResult?: (result: IteratorResult<T>, index: number) => U,
) {
  type GeneratorType = T extends readonly unknown[] ? T[number] : T;
  type IteratorPromise = Promise<{
    index: number;
    result: IteratorResult<GeneratorType>;
  }>;

  const promises: (IteratorPromise | null)[] = (
    generators as AsyncGenerator<GeneratorType>[]
  ).map((gen, index) => gen.next().then((result) => ({ index, result })));

  while (promises.some(Boolean)) {
    const promise = await Promise.race(promises.filter(Boolean));
    if (!promise) {
      continue;
    }

    const { index, result } = promise;

    if (mapResult) {
      const value = mapResult(result as IteratorResult<T>, index);
      if (value != null) {
        yield value;
      }
    } else if (!result.done) {
      yield result.value;
    }

    promises[index] = result.done
      ? null
      : ((generators as AsyncGenerator<GeneratorType>[])[index]
          ?.next()
          .then((r) => ({ index, result: r })) ?? null);
  }
}
