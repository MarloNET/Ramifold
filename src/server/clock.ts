/** Time source of the server; tests replace it. */
export type Clock = { now(): Date };

export const systemClock: Clock = { now: () => new Date() };

/** Current time as ISO-8601 in UTC with milliseconds (TechSpec 2.0), e.g. `2026-11-24T09:42:00.000Z`. */
export function isoNow(clock: Clock): string {
  return clock.now().toISOString();
}
