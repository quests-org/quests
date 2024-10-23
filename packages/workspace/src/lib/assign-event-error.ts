import type {
  AnyEventObject,
  ErrorActorEvent,
  EventObject,
  MachineContext,
  ParameterizedObject,
  ProvidedActor,
} from "xstate";

import { assign } from "xstate";

// Huge hack to get these types to line up. DOESN'T verify machine context has
// an error property.
export function createAssignEventError<
  TContext extends MachineContext & { error?: unknown },
  TExpressionEvent extends AnyEventObject = AnyEventObject,
  TParams extends ParameterizedObject["params"] | undefined =
    | ParameterizedObject["params"]
    | undefined,
  TEvent extends EventObject = EventObject,
  TActor extends ProvidedActor = ProvidedActor,
>() {
  return assign<TContext, TExpressionEvent, TParams, TEvent, TActor>({
    error: ({ event }: AnyEventObject) =>
      (event as unknown as ErrorActorEvent).error as Error,
  } as unknown as TContext);
}
