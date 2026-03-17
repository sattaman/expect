import type { Page } from "playwright";
import type { eventWithTime } from "@rrweb/types";
import { Effect } from "effect";
import { FileSystem } from "effect/FileSystem";
import { RUNTIME_SCRIPT } from "./generated/runtime-script";
import { RecorderInjectionError, SessionLoadError } from "./errors";
import type { CollectResult } from "./types";

export const injectRecorder = Effect.fn("Replay.injectRecorder")(function* (page: Page) {
  yield* Effect.tryPromise({
    try: () => page.addInitScript(RUNTIME_SCRIPT),
    catch: (cause) => new RecorderInjectionError({ cause: String(cause) }),
  });
});

export const collectEvents = Effect.fn("Replay.collectEvents")(function* (page: Page) {
  const events = yield* Effect.tryPromise({
    try: () =>
      page.evaluate(() => {
        const runtime = Reflect.get(globalThis, "__replayRuntime");
        if (!runtime || typeof runtime !== "object") {
          return { events: [], total: 0 };
        }
        const getEvents = Reflect.get(runtime, "getEvents");
        const getEventCount = Reflect.get(runtime, "getEventCount");
        if (typeof getEvents !== "function" || typeof getEventCount !== "function") {
          return { events: [], total: 0 };
        }
        const drained = getEvents() as eventWithTime[];
        const total = (getEventCount() as number) + drained.length;
        return { events: drained, total };
      }),
    catch: (cause) => new RecorderInjectionError({ cause: String(cause) }),
  });

  return events as CollectResult;
});

export const collectAllEvents = Effect.fn("Replay.collectAllEvents")(function* (page: Page) {
  const events = yield* Effect.tryPromise({
    try: () =>
      page.evaluate(() => {
        const runtime = Reflect.get(globalThis, "__replayRuntime");
        if (!runtime || typeof runtime !== "object") {
          return [] as eventWithTime[];
        }
        const getAllEvents = Reflect.get(runtime, "getAllEvents");
        if (typeof getAllEvents !== "function") {
          return [] as eventWithTime[];
        }
        return getAllEvents() as eventWithTime[];
      }),
    catch: (cause) => new RecorderInjectionError({ cause: String(cause) }),
  });

  return events as ReadonlyArray<eventWithTime>;
});

export const saveSession = Effect.fn("Replay.saveSession")(function* (
  events: ReadonlyArray<eventWithTime>,
  outputPath: string,
) {
  const fileSystem = yield* FileSystem;
  const lines = events.map((event) => JSON.stringify(event));
  const content = lines.join("\n") + "\n";
  yield* fileSystem.writeFileString(outputPath, content);
});

export const loadSession = Effect.fn("Replay.loadSession")(function* (sessionPath: string) {
  const fileSystem = yield* FileSystem;
  const content = yield* fileSystem
    .readFileString(sessionPath)
    .pipe(
      Effect.catchTag("PlatformError", (error) =>
        new SessionLoadError({ path: sessionPath, cause: String(error) }).asEffect(),
      ),
    );

  const lines = content.trim().split("\n");
  const events = yield* Effect.forEach(lines, (line, index) =>
    Effect.try({
      try: () => JSON.parse(line) as eventWithTime,
      catch: (cause) =>
        new SessionLoadError({
          path: sessionPath,
          cause: `Invalid JSON at line ${index + 1}: ${String(cause)}`,
        }),
    }),
  );

  return events;
});
