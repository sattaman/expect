import * as crypto from "node:crypto";

import { Config, Effect, Layer, ServiceMap } from "effect";
import { KeyValueStore } from "effect/unstable/persistence";
import { PostHog } from "posthog-node";

import type { EventMap } from "./analytics-events";

// ---------------------------------------------------------------------------
// AnalyticsProvider — abstract provider that Analytics delegates to
// ---------------------------------------------------------------------------

export interface AnalyticsProviderShape {
  readonly capture: (event: {
    readonly eventName: string;
    readonly properties: Record<string, unknown>;
    readonly distinctId: string;
  }) => Effect.Effect<void>;
  readonly flush: Effect.Effect<void>;
}

export class AnalyticsProvider extends ServiceMap.Service<
  AnalyticsProvider,
  AnalyticsProviderShape
>()("@expect/AnalyticsProvider") {}

// ---------------------------------------------------------------------------
// Provider layers
// ---------------------------------------------------------------------------

const layerPostHog = Layer.effect(
  AnalyticsProvider,
  Effect.gen(function* () {
    const host = yield* Config.withDefault(
      Config.string("POSTHOG_HOST"),
      "https://us.i.posthog.com",
    );
    const posthog = new PostHog("phc_t7GoTouuuoDvdybpuD701POQERJs9r2uXrsLQ2LPTfQ", { host });

    return {
      capture: (event: Parameters<AnalyticsProviderShape["capture"]>[0]) =>
        Effect.sync(() => {
          posthog.capture({
            event: event.eventName,
            properties: event.properties,
            distinctId: event.distinctId,
          });
        }),
      flush: Effect.tryPromise({
        try: () => posthog.flush(),
        catch: (cause) => cause,
      }).pipe(Effect.ignore),
    } as const;
  }),
);

const layerDev = Layer.succeed(AnalyticsProvider)({
  capture: (event) =>
    Effect.logInfo("Tracked event", {
      eventName: event.eventName,
      distinctId: event.distinctId,
      ...event.properties,
    }).pipe(Effect.annotateLogs({ module: "Analytics" })),
  flush: Effect.void,
});

// ---------------------------------------------------------------------------
// Analytics — public service
// ---------------------------------------------------------------------------

const DISTINCT_ID_KEY = "analytics:distinct_id";

export class Analytics extends ServiceMap.Service<Analytics>()("@expect/Analytics", {
  make: Effect.gen(function* () {
    const provider = yield* AnalyticsProvider;
    const keyValueStore = yield* KeyValueStore.KeyValueStore;

    const existing = yield* keyValueStore.get(DISTINCT_ID_KEY);
    const distinctId = existing ?? crypto.randomUUID();
    if (existing === undefined) {
      yield* keyValueStore.set(DISTINCT_ID_KEY, distinctId);
    }

    const capture = <K extends keyof EventMap>(
      eventName: K,
      ...[properties]: EventMap[K] extends undefined ? [] : [EventMap[K]]
    ) =>
      Effect.gen(function* () {
        const commonProperties = {
          timestamp: new Date().toISOString(),
        };

        yield* provider.capture({
          eventName: eventName as string,
          properties: { ...commonProperties, ...(properties ?? {}) },
          distinctId,
        });
      }).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("Analytics capture failed", {
            eventName,
            cause,
          }).pipe(Effect.annotateLogs({ module: "Analytics" })),
        ),
      );

    const track: {
      <K extends keyof EventMap>(
        eventName: K & (EventMap[K] extends undefined ? K : never),
      ): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;

      <K extends keyof EventMap, A>(
        eventName: K & (EventMap[K] extends undefined ? never : K),
        deriveProperties: (result: A) => EventMap[K],
      ): <E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
    } = (<K extends keyof EventMap, A>(
      eventName: K,
      deriveProperties?: (result: A) => EventMap[K],
    ) =>
      <E, R>(self: Effect.Effect<A, E, R>) =>
        Effect.tap(self, (result) => {
          const props = deriveProperties ? deriveProperties(result) : undefined;
          return (capture as Function).call(
            undefined,
            eventName,
            ...(props !== undefined ? [props] : []),
          );
        })) as never;

    return { capture, track, flush: provider.flush } as const;
  }),
}) {
  static layerPostHog = Layer.effect(this)(this.make).pipe(Layer.provide(layerPostHog));
  static layerDev = Layer.effect(this)(this.make).pipe(Layer.provide(layerDev));
}
