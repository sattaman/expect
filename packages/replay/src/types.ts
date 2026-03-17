import { Schema } from "effect";
import type { eventWithTime } from "@rrweb/types";

export type { eventWithTime as ReplayEvent } from "@rrweb/types";

export class RecordedSession extends Schema.Class<RecordedSession>("RecordedSession")({
  events: Schema.Array(Schema.Unknown),
  startedAt: Schema.DateTimeUtc,
  duration: Schema.Number,
}) {}

export interface CollectResult {
  readonly events: ReadonlyArray<eventWithTime>;
  readonly total: number;
}
