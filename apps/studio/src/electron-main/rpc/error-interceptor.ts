import { mapEventIterator } from "@orpc/client";
import {
  type Context,
  type Meta,
  type ProcedureClientInterceptorOptions,
} from "@orpc/server";
import {
  type Interceptor,
  isAsyncIteratorObject,
  overlayProxy,
} from "@orpc/shared";

// Allows us to capture streaming and non-streaming errors.
// Adapted from https://github.com/unnoq/orpc/issues/604
export function createErrorClientInterceptor<
  TContext extends Context,
  TResult,
>(options: {
  onAsyncIteratorError?: (
    e: unknown,
    options: ProcedureClientInterceptorOptions<
      TContext,
      Record<never, never>,
      Meta
    >,
  ) => IteratorResult<TResult> | never;
  onError: (
    e: unknown,
    options: ProcedureClientInterceptorOptions<
      TContext,
      Record<never, never>,
      Meta
    >,
  ) => never | TResult;
}): Interceptor<
  ProcedureClientInterceptorOptions<TContext, Record<never, never>, Meta>,
  Promise<unknown>
> {
  const { onAsyncIteratorError, onError } = options;
  return async (o) => {
    try {
      const output = await o.next();
      if (isAsyncIteratorObject(output)) {
        return overlayProxy(
          output,
          mapEventIterator(output, {
            // eslint-disable-next-line @typescript-eslint/require-await
            error: async (error) => {
              /**
               * DON'T treat aborted signal as error if happen during business logic,
               * Because this is streaming response, so the error can't catch by `interceptors` above.
               */
              if (o.signal?.aborted && o.signal.reason === error) {
                // Signal aborted - pass through
              } else if (onAsyncIteratorError) {
                return onAsyncIteratorError(error, o);
              }
              return error;
            },
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            value: (v) => v,
          }),
        );
      }
      return output;
    } catch (error) {
      return onError(error, o);
    }
  };
}
