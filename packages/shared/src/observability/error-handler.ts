import { Cause, Effect, Layer, Predicate, ServiceMap, Stream } from "effect";

import { Analytics } from "../analytics/analytics";

const captureErrorProps = (cause: Cause.Cause<unknown>) => {
  const squashed = Cause.squash(cause);
  const tag = Predicate.hasProperty(squashed, "_tag") ? String(squashed._tag) : "Unknown";
  return {
    error_tag: tag,
    error_message: Cause.pretty(cause),
  };
};

export class ErrorHandler extends ServiceMap.Service<ErrorHandler>()("@expect/ErrorHandler", {
  make: Effect.gen(function* () {
    const analytics = yield* Analytics;

    const orDie = <A, E, R>(self: Effect.Effect<A, E, R>) =>
      self.pipe(
        Effect.tapCause((cause) => analytics.capture("error:unexpected", captureErrorProps(cause))),
        Effect.orDie,
      );

    const streamOrDie = <A, E, R>(self: Stream.Stream<A, E, R>) =>
      self.pipe(
        Stream.tapCause((cause) => analytics.capture("error:unexpected", captureErrorProps(cause))),
        Stream.orDie,
      );

    const tapCause =
      (...messageParts: ReadonlyArray<unknown>) =>
      <A, E, R>(effect: Effect.Effect<A, E, R>) =>
        effect.pipe(
          Effect.tapCause((cause) =>
            Effect.all(
              [
                analytics.capture("error:expected", captureErrorProps(cause)),
                Effect.logError(...messageParts, cause),
              ],
              { discard: true },
            ),
          ),
        );

    return { orDie, streamOrDie, tapCause } as const;
  }),
}) {
  static layer = Layer.effect(this)(this.make);
}
